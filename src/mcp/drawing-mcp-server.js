#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import winston from 'winston';
import { mcpLogger } from '../utils/logger.js';

// MCP-only logger that doesn't output to console to avoid stdio conflicts
const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.File({ 
      filename: '/tmp/mcp-debug.log',
      level: 'debug'
    })
  ]
});

// Get the directory of this script for reliable path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DrawingMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'draw-it-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  // Helper method to get local IP address
  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  // Helper method to get the correct drawings directory path
  getDrawingsPath() {
    // Try multiple possible paths to find the drawings directory
    const possiblePaths = [
      // From script location (src/mcp/) go up to project root
      path.join(__dirname, '..', '..', 'public', 'drawings'),
      // From current working directory
      path.join(process.cwd(), 'public', 'drawings'),
      // Alternative path if running from different location
      path.join(process.cwd(), 'src', '..', 'public', 'drawings'),
    ];

    for (const drawingsPath of possiblePaths) {
      const resolvedPath = path.resolve(drawingsPath);
      logger.debug(`[MCP] Checking drawings path: ${resolvedPath}`);
      
      if (fs.existsSync(resolvedPath)) {
        logger.info(`[MCP] Found drawings directory at: ${resolvedPath}`);
        return resolvedPath;
      }
    }

    // If none found, use the first one as fallback
    const fallbackPath = path.resolve(possiblePaths[0]);
    logger.warn(`[MCP] No drawings directory found, using fallback: ${fallbackPath}`);
    return fallbackPath;
  }

  // Validate JSON response before sending
  validateAndLogResponse(response, requestType) {
    try {
      const jsonString = JSON.stringify(response);
      JSON.parse(jsonString); // Validate JSON
      mcpLogger.debug(`MCP Response - ${requestType} - JSON Valid`, { 
        response,
        jsonLength: jsonString.length 
      });
      return response;
    } catch (error) {
      mcpLogger.error(`MCP Response - ${requestType} - JSON Invalid`, { 
        error: error.message,
        response 
      });
      throw new Error(`Invalid JSON response for ${requestType}: ${error.message}`);
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      mcpLogger.info('MCP Request - ListTools', { request });
      
      const response = {
        tools: [
          {
            name: 'get_drawing_png',
            description: "Retrieve and analyze the current drawing image. Automatically applies smart cropping to remove whitespace and resizes to 640x640(max) for efficient analysis. Use this tool when users want to: examine drawing content, recreate drawings in HTML/CSS, analyze visual elements, convert drawings to code, or get detailed information about shapes, lines, and text in the image.",
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            }
          }
        ]
      };
      
      return this.validateAndLogResponse(response, 'ListTools');
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async (request) => {
      mcpLogger.info('MCP Request - ListResources', { request });
      
      const response = {
        resources: []
      };
      
      return this.validateAndLogResponse(response, 'ListResources');
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async (request) => {
      mcpLogger.info('MCP Request - ListPrompts', { request });
      
      const response = {
        prompts: []
      };
      
      return this.validateAndLogResponse(response, 'ListPrompts');
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      mcpLogger.info('MCP Request - CallTool', { 
        tool: name, 
        arguments: args,
        timestamp: new Date().toISOString()
      });

      try {
        let response;
        switch (name) {
          case 'get_drawing_png':
            response = await this.getDrawingPng();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        mcpLogger.info('MCP Response - CallTool', { 
          tool: name,
          success: true,
          responseSize: JSON.stringify(response).length,
          timestamp: new Date().toISOString()
        });
        
        return this.validateAndLogResponse(response, `CallTool-${name}`);
      } catch (error) {
        const errorResponse = {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
        
        mcpLogger.error('MCP Response - CallTool Error', { 
          tool: name,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        return this.validateAndLogResponse(errorResponse, `CallTool-${name}-Error`);
      }
    });
  }

  // Smart crop function using Sharp to remove whitespace
  async smartCrop(imagePath) {
    try {
      const image = sharp(imagePath);
      const { width, height } = await image.metadata();
      
      // Use Sharp's trim feature to remove whitespace automatically
      // This removes pixels that are similar to the corner pixels
      const trimmed = await image
        .trim({ threshold: 10 }) // Remove pixels within 10% similarity to corners
        .toBuffer();
      
      const trimmedImage = sharp(trimmed);
      const { width: croppedWidth, height: croppedHeight } = await trimmedImage.metadata();
      
      return {
        image: trimmedImage,
        originalSize: { width, height },
        croppedSize: { width: croppedWidth, height: croppedHeight }
      };
    } catch (error) {
      logger.error('[MCP] Smart crop failed:', error);
      // Fallback to center crop
      const image = sharp(imagePath);
      const { width, height } = await image.metadata();
      const size = Math.min(width, height);
      const x = Math.floor((width - size) / 2);
      const y = Math.floor((height - size) / 2);
      
      const centerCropped = await image
        .extract({ left: x, top: y, width: size, height: size })
        .toBuffer();
      
      return {
        image: sharp(centerCropped),
        originalSize: { width, height },
        croppedSize: { width: size, height: size }
      };
    }
  }

  async getDrawingPng() {
    logger.debug('[MCP] Get drawing png called with smart cropping');
    
    try {
      const response = await fetch('http://localhost:3001/api/drawing');
      
      if (!response.ok) {
        return {
          content: [
            {
              type: 'text',
              text: `No drawing data available. App status: ${response.status}. Start the drawing app: npm run dev`,
            },
          ],
        };
      }
      
      const data = await response.json();
      
      if (!data.filePath) {
        return {
          content: [
            {
              type: 'text',
              text: 'No drawing found. Please create a drawing at http://localhost:3001 first.',
            },
          ],
        };
      }

      // Get PNG file path
      const drawingsDir = this.getDrawingsPath();
      const filename = data.filePath ? path.basename(data.filePath) : 'current-active.png';
      const imagePath = path.join(drawingsDir, filename);
      
      logger.debug(`[MCP] Looking for image file:`, {
        drawingsDir,
        filename,
        imagePath,
        exists: fs.existsSync(imagePath)
      });
      
      if (!fs.existsSync(imagePath)) {
        // List files in the drawings directory for debugging
        try {
          const files = fs.readdirSync(drawingsDir);
          logger.debug(`[MCP] Files in drawings directory: ${files.join(', ')}`);
        } catch (error) {
          logger.error(`[MCP] Cannot read drawings directory: ${error.message}`);
        }
        
        return {
          content: [
            {
              type: 'text',
              text: `Image file not found: ${imagePath}. Drawings directory: ${drawingsDir}`,
            },
          ],
        };
      }

      // Smart crop to remove whitespace using Sharp
      const cropResult = await this.smartCrop(imagePath);
      
      // Calculate optimal size while maintaining aspect ratio
      const { width: croppedWidth, height: croppedHeight } = cropResult.croppedSize;
      const aspectRatio = croppedWidth / croppedHeight;
      
      // Determine target dimensions based on aspect ratio
      // Keep the longer side at 640px, scale the shorter side proportionally
      let targetWidth, targetHeight;
      const maxSize = 640;
      
      if (aspectRatio > 1) {
        // Landscape: width is longer
        targetWidth = maxSize;
        targetHeight = Math.round(maxSize / aspectRatio);
      } else {
        // Portrait or square: height is longer or equal
        targetHeight = maxSize;
        targetWidth = Math.round(maxSize * aspectRatio);
      }
      
      // Save the resized image to last_mcp_transfer.png
      const transferFilePath = path.join(drawingsDir, 'last_mcp_transfer.png');
      
      await cropResult.image
        .resize(targetWidth, targetHeight, { 
          fit: 'fill', // Exact dimensions, no padding
          withoutEnlargement: false 
        })
        .png()
        .toFile(transferFilePath);
      
      // Create file:// URL for the saved image
      const fileUrl = `file://${transferFilePath}`;
      
      // Debug logging
      logger.debug('[MCP] Response data:', {
        cropResult,
        targetWidth,
        targetHeight,
        fileUrl
      });
      
      const textContent = {
        type: 'text',
        text: `Drawing optimized successfully. Original: ${cropResult?.originalSize?.width || 'unknown'}x${cropResult?.originalSize?.height || 'unknown'}, Cropped: ${cropResult?.croppedSize?.width || 'unknown'}x${cropResult?.croppedSize?.height || 'unknown'}, Final: ${targetWidth || 'unknown'}x${targetHeight || 'unknown'}`,
      };
      
      const resourceContent = {
        type: 'resource',
        resource_id: `drawing_${Date.now()}`,
        uri: fileUrl || 'unknown',
        mimeType: 'image/png',
        description: `Optimized drawing image (${targetWidth || 'unknown'}x${targetHeight || 'unknown'})`
      };
      
      const finalResponse = {
        content: [textContent, resourceContent],
      };
      
      // Validate each content item
      finalResponse.content.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          logger.error(`[MCP] Content item ${index} is invalid:`, item);
        }
        if (!item.type) {
          logger.error(`[MCP] Content item ${index} missing type:`, item);
        }
      });
      
      return this.validateAndLogResponse(finalResponse, 'CallTool-get_drawing_png');
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Failed to get optimized drawing data: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Only log to files, not console for MCP stdio compatibility
    logger.info('Draw-it MCP Server running with stdio transport');
  }
}

const server = new DrawingMCPServer();
server.run().catch((error) => {
  logger.error('MCP Server failed to start:', error);
  process.exit(1);
});
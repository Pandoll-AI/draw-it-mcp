import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, rename, unlink, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import logger, { processLogger } from '../../../utils/logger';

// Create drawings directory if it doesn't exist
const DRAWINGS_DIR = path.join(process.cwd(), 'public', 'drawings');

async function ensureDrawingsDir() {
  if (!existsSync(DRAWINGS_DIR)) {
    await mkdir(DRAWINGS_DIR, { recursive: true });
  }
}

// In-memory storage for current drawing info
let currentDrawing = {
  timestamp: Date.now(),
  width: 800,
  height: 600,
  filePath: ''
};


// Function to load current drawing info from file
async function loadCurrentDrawingFromFile() {
  const currentActiveFile = path.join(DRAWINGS_DIR, 'current-active.png');
  
  if (existsSync(currentActiveFile) && !currentDrawing.filePath) {
    try {
      const stats = await stat(currentActiveFile);
      currentDrawing = {
        timestamp: stats.mtime.getTime(),
        width: 800,
        height: 600,
        filePath: '/drawings/current-active.png'
      };
      
      logger.debug('[API] Loaded current drawing info from file');
      processLogger.info('API', 'Loaded drawing from file');
    } catch (error) {
      logger.error('[API] Failed to load current drawing from file:', error);
    }
  }
}

export async function GET() {
  await loadCurrentDrawingFromFile();
  
  logger.debug('[API] GET request for current drawing:', {
    filePath: currentDrawing.filePath,
    timestamp: currentDrawing.timestamp
  });
  
  return NextResponse.json(currentDrawing);
}


// Helper function to convert dataURL to PNG buffer
function dataURLToPNG(dataURL: string): Buffer {
  const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const filename = data.filename || 'current-active.png';
    const width = data.width || 800;
    const height = data.height || 600;
    
    if (!data.dataURL || !data.dataURL.startsWith('data:image/')) {
      logger.error('[API] Invalid image data received');
      return NextResponse.json({ success: false, error: 'Invalid image data' }, { status: 400 });
    }
    
    logger.debug('[API] Received drawing data:', {
      filename,
      dataURLLength: data.dataURL.length,
      width,
      height
    });
    processLogger.info('API', `Saving ${filename}`);

    await ensureDrawingsDir();
    
    const filePath = path.join(DRAWINGS_DIR, filename);
    const tempFilePath = path.join(DRAWINGS_DIR, `.${filename}`);
    
    // Convert dataURL to PNG buffer
    const buffer = dataURLToPNG(data.dataURL);
    
    // Backup existing file if exists
    if (existsSync(filePath)) {
      await rename(filePath, tempFilePath);
    }
    
    try {
      await writeFile(filePath, buffer);
      
      if (existsSync(tempFilePath)) {
        await unlink(tempFilePath);
      }
    } catch (saveError) {
      if (existsSync(tempFilePath)) {
        await rename(tempFilePath, filePath);
      }
      throw saveError;
    }
    
    // Update in-memory storage
    const timestamp = Date.now();
    const drawingInfo = {
      timestamp,
      width,
      height,
      filePath: `/drawings/${filename}`
    };
    
    logger.debug('[API] Created drawing info:', drawingInfo);
    
    // Set as current drawing if it's current-active.png
    if (filename === 'current-active.png') {
      currentDrawing = drawingInfo;
      logger.debug('[API] Set as current drawing');
    }
    
    return NextResponse.json({ 
      success: true, 
      filePath: drawingInfo.filePath,
      timestamp: drawingInfo.timestamp,
      filename: filename
    });
  } catch (error) {
    logger.error('Error saving drawing:', error);
    processLogger.info('API', 'Failed to save drawing');
    return NextResponse.json({ success: false, error: 'Failed to save drawing' }, { status: 500 });
  }
}
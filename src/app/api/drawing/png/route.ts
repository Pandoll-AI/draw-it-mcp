import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DRAWINGS_DIR = path.join(process.cwd(), 'public', 'drawings');

// Get current drawing as PNG file
export async function GET(request: NextRequest) {
  try {
    console.log('[PNG API] PNG file request received');
    
    // First get current drawing info from the main API
    const baseUrl = request.nextUrl.origin;
    console.log('[PNG API] Fetching drawing info from:', `${baseUrl}/api/drawing`);
    
    const response = await fetch(`${baseUrl}/api/drawing`);
    
    if (!response.ok) {
      console.error('[PNG API] Failed to get drawing info:', response.status);
      return NextResponse.json({ success: false, error: 'No current drawing found' }, { status: 404 });
    }
    
    const drawingInfo = await response.json();
    console.log('[PNG API] Retrieved drawing info:', {
      hasDataURL: !!drawingInfo.dataURL,
      dataURLLength: drawingInfo.dataURL ? drawingInfo.dataURL.length : 0,
      filePath: drawingInfo.filePath,
      timestamp: drawingInfo.timestamp
    });
    
    if (!drawingInfo.filePath) {
      console.error('[PNG API] No filePath in drawing info');
      return NextResponse.json({ success: false, error: 'Drawing has no saved PNG file' }, { status: 404 });
    }
    
    // Construct full file path
    const filename = path.basename(drawingInfo.filePath);
    const fullPath = path.join(DRAWINGS_DIR, filename);
    
    console.log('[PNG API] Looking for file:', {
      filePath: drawingInfo.filePath,
      filename: filename,
      fullPath: fullPath,
      drawingsDir: DRAWINGS_DIR
    });
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      console.error('[PNG API] PNG file not found on disk:', fullPath);
      return NextResponse.json({ success: false, error: 'PNG file not found on disk' }, { status: 404 });
    }
    
    // Read and return PNG file
    const pngBuffer = await readFile(fullPath);
    
    console.log('[PNG API] Successfully read PNG file:', {
      filePath: fullPath,
      fileSize: pngBuffer.length,
      timestamp: drawingInfo.timestamp
    });
    
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Drawing-Timestamp': drawingInfo.timestamp.toString(),
        'X-Drawing-Dimensions': `${drawingInfo.width}x${drawingInfo.height}`
      }
    });
    
  } catch (error) {
    console.error('Error serving PNG file:', error);
    return NextResponse.json({ success: false, error: 'Failed to serve PNG file' }, { status: 500 });
  }
}
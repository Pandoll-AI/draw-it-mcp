import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const DRAWINGS_DIR = path.join(process.cwd(), 'public', 'drawings');

// Get current drawing as PNG file
export async function GET(request: NextRequest) {
  try {
    console.log('[PNG API] PNG file request received');
    
    // Get current drawing info directly from file system instead of internal API call
    const currentActiveFile = path.join(DRAWINGS_DIR, 'current-active.png');
    
    console.log('[PNG API] Looking for current active drawing at:', currentActiveFile);
    
    // Check if current active file exists
    if (!existsSync(currentActiveFile)) {
      console.error('[PNG API] Current active PNG file not found:', currentActiveFile);
      return NextResponse.json({ success: false, error: 'No current drawing found' }, { status: 404 });
    }
    
    // Read and return PNG file
    const pngBuffer = await readFile(currentActiveFile);
    const stats = await stat(currentActiveFile);
    
    console.log('[PNG API] Successfully read PNG file:', {
      filePath: currentActiveFile,
      fileSize: pngBuffer.length,
      timestamp: stats.mtime.getTime()
    });
    
    return new Response(pngBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': pngBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Drawing-Timestamp': stats.mtime.getTime().toString(),
        'X-Drawing-Dimensions': '800x600'
      }
    });
    
  } catch (error) {
    console.error('Error serving PNG file:', error);
    return NextResponse.json({ success: false, error: 'Failed to serve PNG file' }, { status: 500 });
  }
}
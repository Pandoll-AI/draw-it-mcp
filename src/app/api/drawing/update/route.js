import { NextRequest, NextResponse } from 'next/server';

// This endpoint triggers the web client to send an updated drawing
export async function POST(request) {
  try {
    const { requestId } = await request.json();
    
    console.log('[UPDATE API] Received update request:', { requestId });
    
    // Simply return success - the MCP client will handle requesting the drawing
    return NextResponse.json({ 
      success: true, 
      message: 'Update request received',
      requestId: requestId 
    });
  } catch (error) {
    console.error('[UPDATE API] Error processing update request:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process update request' 
    }, { status: 500 });
  }
}
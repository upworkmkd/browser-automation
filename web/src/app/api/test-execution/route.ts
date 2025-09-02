import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Simple test endpoint to verify API is working
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Web interface API is working!'
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      status: 'received',
      received: body,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    )
  }
}

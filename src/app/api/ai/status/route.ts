import { NextResponse } from 'next/server'

export async function GET() {
  try {
    let available = false
    try {
      const { createLLM } = await import('z-ai-web-dev-sdk')
      if (typeof createLLM === 'function') {
        available = true
      }
    } catch {
      available = false
    }

    return NextResponse.json({ available })
  } catch {
    return NextResponse.json({ available: false })
  }
}
import { NextResponse } from 'next/server'
import { AuthError, handleApiError, requireAuth } from '@/lib/auth-utils'

export async function GET() {
  try {
    await requireAuth()
    let available = false
    try {
      // @ts-ignore
      const { createLLM } = await import('z-ai-web-dev-sdk')
      if (typeof createLLM === 'function') {
        available = true
      }
    } catch {
      available = false
    }

    return NextResponse.json({ available })
  } catch (error) {
    if (error instanceof AuthError) return handleApiError(error)
    return NextResponse.json({ available: false })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const upload = await db.upload.findUnique({ where: { id } })

    if (!upload) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    return new NextResponse(upload.data, {
      headers: {
        'Content-Type': upload.mimeType,
        'Content-Length': String(upload.size),
        'Content-Disposition': `inline; filename="${encodeURIComponent(upload.filename)}"`,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error: any) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}

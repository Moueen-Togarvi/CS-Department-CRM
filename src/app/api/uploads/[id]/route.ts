import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { handleApiError, requireAuth } from '@/lib/auth-utils'
import { canRenderInline, safeContentType, safeFilename } from '@/lib/upload-safety'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params
    const upload = await db.upload.findUnique({ where: { id } })

    if (!upload) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Rows written before the allowlist existed may still hold text/html, so
    // the stored type is re-checked here rather than echoed straight back.
    const contentType = safeContentType(upload.mimeType)
    const disposition = canRenderInline(contentType) ? 'inline' : 'attachment'

    return new NextResponse(upload.data, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(upload.size),
        'Content-Disposition': `${disposition}; filename="${safeFilename(upload.filename)}"`,
        // Stops the browser second-guessing the declared type.
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
        // Private now that a session is required.
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to serve file')
  }
}

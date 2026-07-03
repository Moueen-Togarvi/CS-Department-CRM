import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const MAX_SIZE = 25 * 1024 * 1024 // 25 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 413 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const upload = await db.upload.create({
      data: {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        data: buffer,
      },
    })

    return NextResponse.json({ url: `/api/uploads/${upload.id}` })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

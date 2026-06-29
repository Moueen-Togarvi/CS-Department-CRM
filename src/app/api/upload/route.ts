import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    
    // Ensure uploads directory exists
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (e) {}

    // Generate a clean, unique name
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const filename = `${uniqueSuffix}-${safeName}`
    const filepath = join(uploadDir, filename)

    await writeFile(filepath, buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

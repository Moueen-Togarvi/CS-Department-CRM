import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const filePath = path.join(process.cwd(), 'data', 'class-rooms.json')

async function getMappings() {
  try {
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    try {
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data)
    } catch {
      await fs.writeFile(filePath, JSON.stringify({}), 'utf-8')
      return {}
    }
  } catch (e) {
    return {}
  }
}

export async function GET() {
  const mappings = await getMappings()
  return NextResponse.json({ success: true, data: mappings })
}

export async function POST(req: Request) {
  try {
    const { semester, section, roomId, roomName, floor } = await req.json()
    if (!semester || !section) {
      return NextResponse.json({ success: false, error: 'Missing semester or section' }, { status: 400 })
    }

    const mappings = await getMappings()
    const key = `${semester}-${section}`
    
    mappings[key] = {
      roomId,
      roomName,
      floor: floor !== undefined && floor !== null ? Number(floor) : null
    }

    await fs.writeFile(filePath, JSON.stringify(mappings, null, 2), 'utf-8')
    return NextResponse.json({ success: true, data: mappings[key] })
  } catch (error) {
    console.error('POST /api/students/class-rooms error:', error)
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { requireAdmin, requireFacultyOrAdmin, handleApiError } from '@/lib/auth-utils'

const jsonFilePath = path.join(process.cwd(), 'data', 'class-rooms.json')

// One-time migration: import legacy JSON mappings into the DB.
// The JSON file is read-only on serverless hosts (e.g. Vercel), so the DB
// is the only durable store. Reading the legacy file once is still safe.
let migrated = false
async function migrateFromJson() {
  if (migrated) return
  migrated = true
  try {
    const count = await db.classRoomAssignment.count()
    if (count > 0) return
    let raw: string
    try {
      raw = await fs.readFile(jsonFilePath, 'utf-8')
    } catch {
      return
    }
    const parsed = JSON.parse(raw) as Record<
      string,
      { roomId?: string | null; roomName?: string | null; floor?: number | null }
    >
    for (const [key, val] of Object.entries(parsed)) {
      const dashIdx = key.indexOf('-')
      if (dashIdx === -1) continue
      const semester = Number(key.slice(0, dashIdx))
      const section = key.slice(dashIdx + 1)
      if (!semester || !section || Number.isNaN(semester)) continue
      await db.classRoomAssignment.upsert({
        where: { semester_section: { semester, section } },
        update: {},
        create: {
          semester,
          section,
          roomId: val.roomId ?? null,
          roomName: val.roomName ?? null,
          floor: val.floor ?? null,
        },
      })
    }
  } catch {
    // ignore — migration is best-effort
  }
}

export async function GET() {
  try {
    await requireFacultyOrAdmin()
    await migrateFromJson()
    const assignments = await db.classRoomAssignment.findMany()
    const data: Record<string, { roomId: string | null; roomName: string | null; floor: number | null }> = {}
    for (const a of assignments) {
      data[`${a.semester}-${a.section}`] = {
        roomId: a.roomId,
        roomName: a.roomName,
        floor: a.floor,
      }
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch class rooms')
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin()
    const { semester, section, room, roomId, floor } = await req.json()
    if (!semester || !section) {
      return NextResponse.json({ success: false, error: 'Missing semester or section' }, { status: 400 })
    }

    const assignment = await db.classRoomAssignment.upsert({
      where: { semester_section: { semester: Number(semester), section } },
      update: {
        roomId: roomId || null,
        roomName: room || null,
        floor: floor !== undefined && floor !== null ? Number(floor) : null,
      },
      create: {
        semester: Number(semester),
        section,
        roomId: roomId || null,
        roomName: room || null,
        floor: floor !== undefined && floor !== null ? Number(floor) : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: { roomName: assignment.roomName, floor: assignment.floor },
    })
  } catch (error) {
    return handleApiError(error, 'Failed to assign class room')
  }
}

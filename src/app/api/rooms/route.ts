import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireRole } from '@/lib/auth'
import { createRoomSchema } from '@/lib/validators/room'

export async function GET(request: NextRequest) {
  try {
    const rooms = await db.room.findMany({
      select: {
        id: true,
        name: true,
        building: true,
        floor: true,
        capacity: true,
        roomType: true,
        hasProjector: true,
        hasAC: true,
        isAvailable: true,
      },
      orderBy: [{ building: 'asc' }, { name: 'asc' }],
    })

    return successResponse(rooms)
  } catch (error) {
    console.error('GET /api/rooms error:', error)
    return errorResponse('Failed to fetch rooms', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, 'ADMIN')

    const body = await request.json()
    const parsed = createRoomSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(firstError?.message || 'Invalid input', 400)
    }

    const data = parsed.data

    // Check if room name in the same building already exists
    const existingRoom = await db.room.findFirst({
      where: {
        name: data.name,
        building: data.building,
      },
    })

    if (existingRoom) {
      return errorResponse('Room already exists in this building', 409)
    }

    const room = await db.room.create({
      data: {
        name: data.name,
        building: data.building,
        floor: data.floor,
        capacity: data.capacity,
        roomType: data.roomType,
        hasProjector: data.hasProjector,
        hasAC: data.hasAC,
        isAvailable: data.isAvailable,
      },
    })

    return successResponse(room, 'Room created successfully', 201)
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return errorResponse(error.message, error.message.includes('Forbidden') ? 403 : 401)
      }
    }
    console.error('POST /api/rooms error:', error)
    return errorResponse('Failed to create room', 500)
  }
}
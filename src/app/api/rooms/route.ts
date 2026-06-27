import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

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
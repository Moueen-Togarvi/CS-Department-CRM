import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireRole } from '@/lib/auth'
import { updateRoomSchema } from '@/lib/validators/room'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN')
    const id = params.id

    const body = await request.json()
    const parsed = updateRoomSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(firstError?.message || 'Invalid input', 400)
    }

    const data = parsed.data

    const existingRoom = await db.room.findUnique({
      where: { id },
    })

    if (!existingRoom) {
      return errorResponse('Room not found', 404)
    }

    // Check if renamed room name already exists in the same building
    if (data.name || data.building) {
      const targetName = data.name ?? existingRoom.name
      const targetBuilding = data.building ?? existingRoom.building
      const duplicateRoom = await db.room.findFirst({
        where: {
          name: targetName,
          building: targetBuilding,
          id: { not: id },
        },
      })
      if (duplicateRoom) {
        return errorResponse('A room with this name already exists in the building', 409)
      }
    }

    const updatedRoom = await db.room.update({
      where: { id },
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

    return successResponse(updatedRoom, 'Room updated successfully')
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return errorResponse(error.message, error.message.includes('Forbidden') ? 403 : 401)
      }
    }
    console.error(`PUT /api/rooms/${params.id} error:`, error)
    return errorResponse('Failed to update room', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole(request, 'ADMIN')
    const id = params.id

    const existingRoom = await db.room.findUnique({
      where: { id },
    })

    if (!existingRoom) {
      return errorResponse('Room not found', 404)
    }

    // Check if room is used in timetables
    const inUse = await db.timetable.findFirst({
      where: { roomId: id },
    })

    if (inUse) {
      return errorResponse('Cannot delete room because it is assigned in the timetable', 400)
    }

    await db.room.delete({
      where: { id },
    })

    return successResponse(null, 'Room deleted successfully')
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return errorResponse(error.message, error.message.includes('Forbidden') ? 403 : 401)
      }
    }
    console.error(`DELETE /api/rooms/${params.id} error:`, error)
    return errorResponse('Failed to delete room', 500)
  }
}

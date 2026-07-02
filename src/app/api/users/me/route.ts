import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        student: { include: { department: { select: { id: true, name: true, code: true } } } },
        faculty: { include: { department: { select: { id: true, name: true, code: true } } } },
      },
    })

    if (!user) {
      return errorResponse('User not found', 404)
    }

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      student: user.student,
      faculty: user.faculty,
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch profile')
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth()

    if (session.user.role === 'STUDENT') {
      return errorResponse('Students are not allowed to update their profile', 403)
    }

    const body = await request.json()
    const { name, phone, avatar, address, mobileNumber, oldPassword, newPassword, confirmPassword } = body

    const userUpdate: Record<string, unknown> = {}
    if (name !== undefined) userUpdate.name = name
    if (phone !== undefined) userUpdate.phone = phone || null
    if (avatar !== undefined) userUpdate.avatar = avatar || null
    if (newPassword !== undefined && newPassword !== '') {
      if (session.user.role === 'ADMIN') {
        const currentUser = await db.user.findUnique({
          where: { id: session.user.id },
        })
        if (!currentUser) {
          return errorResponse('User not found', 404)
        }
        if (!oldPassword) {
          return errorResponse('Old password is required', 400)
        }
        const isMatch = await bcrypt.compare(oldPassword, currentUser.password)
        if (!isMatch) {
          return errorResponse('Incorrect old password', 400)
        }
        if (newPassword !== confirmPassword) {
          return errorResponse('New password and confirm password do not match', 400)
        }
        userUpdate.password = await bcrypt.hash(newPassword, 10)
      } else {
        return errorResponse('Only Coordinator can update password here', 403)
      }
    }

    const updated = await db.user.update({
      where: { id: session.user.id },
      data: userUpdate,
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
    })

    // Update student contact fields if applicable
    if ((address !== undefined || mobileNumber !== undefined) && updated.role === 'STUDENT') {
      const studentUpdate: Record<string, unknown> = {}
      if (address !== undefined) studentUpdate.address = address || null
      if (mobileNumber !== undefined) studentUpdate.mobileNumber = mobileNumber || null
      await db.student.updateMany({
        where: { userId: session.user.id },
        data: studentUpdate,
      })
    }

    return successResponse(updated, 'Profile updated successfully')
  } catch (error) {
    return handleApiError(error, 'Failed to update profile')
  }
}

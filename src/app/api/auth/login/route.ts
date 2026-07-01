import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash, compare } from 'bcryptjs'

// GET /api/auth/login — check session
export async function GET() {
  // In a real app with NextAuth this would check the session cookie.
  // For now, we return no user (unauthenticated) to keep it simple.
  return NextResponse.json({ user: null })
}

// POST /api/auth/login — authenticate user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        password: true,
        isActive: true,
        student: { select: { studentId: true } },
        faculty: { select: { facultyId: true } },
      },
    })

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const isValid = await compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Return user without password
    const { password: _, isActive: __, student, faculty, ...safeUser } = user

    return NextResponse.json({
      user: {
        ...safeUser,
        studentId: student?.studentId || null,
        facultyId: faculty?.facultyId || null,
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { parseBody } from '@/lib/validators/request'
import { loginSchema } from '@/lib/validators/login'
import { db } from '@/lib/db'
import { hash, compare } from 'bcryptjs'
import {
  clientIp,
  LOGIN_RATE_LIMIT,
  loginRateLimitKey,
  rateLimit,
  resetRateLimit,
} from '@/lib/rate-limit'

// GET /api/auth/login — check session
export async function GET() {
  // In a real app with NextAuth this would check the session cookie.
  // For now, we return no user (unauthenticated) to keep it simple.
  return NextResponse.json({ user: null })
}

// POST /api/auth/login — authenticate user
export async function POST(req: NextRequest) {
  try {
    const parsed = await parseBody(req, loginSchema)
    if (!parsed.ok) return parsed.response
    const { email, password } = parsed.data

    // Throttle before touching the database, so guessing costs an attacker
    // nothing less than a full window regardless of whether the account exists.
    const key = loginRateLimitKey(clientIp(req.headers), email)
    const limit = rateLimit(key, LOGIN_RATE_LIMIT)
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-in attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
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

    // Successful sign-in — don't hold earlier typos against this user.
    resetRateLimit(key)

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
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { parsePaginationParams, skipTake } from '@/lib/pagination'
import { paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createStudentSchema } from '@/lib/validators/student'
import { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, limit, search, sort, order } = parsePaginationParams(searchParams)

    const batch = searchParams.get('batch') || undefined
    const semester = searchParams.get('semester') || undefined
    const status = searchParams.get('status') || undefined
    const section = searchParams.get('section') || undefined
    const session = searchParams.get('session') || undefined

    const where: Prisma.StudentWhereInput = {
      status: { not: 'INACTIVE' },
    }

    if (search) {
      where.OR = [
        { studentId: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ]
    }

    if (batch && batch !== 'all') {
      where.batch = batch
    }

    if (semester && semester !== 'all') {
      where.currentSemester = parseInt(semester)
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (section && section !== 'all') {
      where.section = section
    }

    if (session && session !== 'all') {
      where.session = session
    }

    const orderBy: Prisma.StudentOrderByWithRelationInput = {}
    if (sort === 'studentId') {
      orderBy.studentId = order
    } else if (sort === 'name') {
      orderBy.user = { name: order }
    } else if (sort === 'batch') {
      orderBy.batch = order
    } else if (sort === 'currentSemester') {
      orderBy.currentSemester = order
    } else if (sort === 'gpa') {
      orderBy.gpa = order
    } else if (sort === 'status') {
      orderBy.status = order
    } else {
      orderBy.createdAt = order
    }

    const { skip, take } = skipTake(page, limit)

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        include: {
          user: {
            select: { email: true, name: true, isActive: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy,
        skip,
        take,
      }),
      db.student.count({ where }),
    ])

    const data = students.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.user.name,
      email: s.user.email,
      batch: s.batch,
      currentSemester: s.currentSemester,
      program: s.program,
      gpa: s.gpa,
      status: s.status,
      gender: s.gender,
      department: s.department,
      isActive: s.user.isActive,
      profilePicture: s.profilePicture,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }))

    return paginatedResponse(data, total, page, limit)
  } catch (error) {
    console.error('GET /api/students error:', error)
    return errorResponse('Failed to fetch students', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = createStudentSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      return errorResponse(firstError.message, 400)
    }

    const data = parsed.data

    // Check unique studentId
    const existingStudentId = await db.student.findUnique({
      where: { studentId: data.studentId },
    })
    if (existingStudentId) {
      return errorResponse('Student ID already exists', 409)
    }

    // Check unique email
    const existingEmail = await db.user.findUnique({
      where: { email: data.email },
    })
    if (existingEmail) {
      return errorResponse('Email already exists', 409)
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Create user + student in a transaction
    const student = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          password: hashedPassword,
          name: data.name,
          role: 'STUDENT',
          phone: data.phone,
        },
      })

      return tx.student.create({
        data: {
          userId: user.id,
          studentId: data.studentId,
          departmentId: data.departmentId,
          currentSemester: data.currentSemester,
          enrollmentYear: data.enrollmentYear,
          batch: data.batch || null,
          program: data.program,
          gender: data.gender || null,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          address: data.address || null,
          guardianName: data.guardianName || null,
          guardianPhone: data.guardianPhone || null,
          emergencyContact: data.emergencyContact || null,
          profilePicture: data.profilePicture || null,
          fatherName: data.fatherName || null,
          cnic: data.cnic || null,
          mobileNumber: data.mobileNumber || null,
          fatherPhone: data.fatherPhone || null,
          session: data.session || null,
          section: data.section || null,
        },
        include: {
          user: {
            select: { email: true, name: true, isActive: true },
          },
          department: {
            select: { id: true, name: true, code: true },
          },
        },
      })
    })

    return successResponse(
      {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
        email: student.user.email,
        batch: student.batch,
        currentSemester: student.currentSemester,
        program: student.program,
        gpa: student.gpa,
        status: student.status,
        gender: student.gender,
        department: student.department,
        createdAt: student.createdAt,
      },
      'Student created successfully',
      201
    )
  } catch (error) {
    console.error('POST /api/students error:', error)
    return errorResponse('Failed to create student', 500)
  }
}
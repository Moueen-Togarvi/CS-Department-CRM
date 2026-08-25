import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { googleFormStudentSchema } from '@/lib/validators/google-form'
import { timingSafeEqual } from 'crypto'

/** Constant-time compare so the token can't be guessed byte-by-byte. */
function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Shared-secret webhook: it is called by Google Apps Script, not a browser, so
// there is no session to check. The secret must come from the environment —
// a hardcoded fallback would be public the moment the repo is shared.
const SECRET_TOKEN = process.env.GOOGLE_FORM_SECRET_TOKEN

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { secret } = body ?? {}

    // 1. Authenticate Request
    if (!SECRET_TOKEN) {
      console.error('GOOGLE_FORM_SECRET_TOKEN is not set — refusing the request')
      return NextResponse.json(
        { success: false, error: 'Integration is not configured' },
        { status: 503 }
      )
    }
    if (typeof secret !== 'string' || !timingSafeMatch(secret, SECRET_TOKEN)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid secret token' },
        { status: 401 }
      )
    }

    // Shape is only validated once the caller has proved they hold the secret.
    const parsed = googleFormStudentSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      return NextResponse.json(
        { success: false, error: `${issue.path.join('.')}: ${issue.message}` },
        { status: 400 }
      )
    }
    const {
      name,
      email,
      studentId,
      program,
      currentSemester,
      enrollmentYear,
      session,
      batch,
      mobileNumber,
      address,
      cnic,
      fatherName,
      fatherPhone,
      departmentCode,
    } = parsed.data

    // 2. Validate Required Fields
    if (!name || !email || !studentId) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing: name, email, studentId are mandatory' },
        { status: 400 }
      )
    }

    // 3. Check if user or student already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: `User with email "${email}" already exists` },
        { status: 400 }
      )
    }

    const existingStudent = await db.student.findUnique({
      where: { studentId: studentId.trim() },
    })
    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: `Student with Student ID "${studentId}" already exists` },
        { status: 400 }
      )
    }

    // 4. Determine Department
    let department: any = null
    if (departmentCode) {
      department = await db.department.findUnique({
        where: { code: departmentCode.toUpperCase().trim() },
      })
    }
    if (!department) {
      // Fallback to default/first department
      department = await db.department.findFirst()
    }
    if (!department) {
      return NextResponse.json(
        { success: false, error: 'No departments found in the system. Please create a department first.' },
        { status: 500 }
      )
    }

    // 5. Hash a Default Password (e.g. "student123")
    const defaultPassword = 'student123'
    const hashedPassword = await bcrypt.hash(defaultPassword, 10)

    // 6. Create User and Student record in a single transaction
    const newUser = await db.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: 'STUDENT',
        },
      })

      const semNum = currentSemester ? parseInt(String(currentSemester), 10) : 1
      const yearNum = enrollmentYear ? parseInt(String(enrollmentYear), 10) : new Date().getFullYear()

      await tx.student.create({
        data: {
          userId: u.id,
          studentId: studentId.trim(),
          departmentId: department.id,
          currentSemester: isNaN(semNum) ? 1 : semNum,
          enrollmentYear: isNaN(yearNum) ? new Date().getFullYear() : yearNum,
          program: program ? program.trim() : 'BS',
          session: session ? session.trim() : null,
          batch: batch ? String(batch).trim() : null,
          mobileNumber: mobileNumber ? mobileNumber.trim() : null,
          address: address ? address.trim() : null,
          cnic: cnic ? cnic.trim() : null,
          fatherName: fatherName ? fatherName.trim() : null,
          fatherPhone: fatherPhone ? fatherPhone.trim() : null,
        },
      })

      return u
    })

    return NextResponse.json({
      success: true,
      message: `Student "${newUser.name}" successfully registered.`,
      email: newUser.email,
      studentId: studentId.trim(),
    })
  } catch (error: any) {
    console.error('Google Form Integration Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}

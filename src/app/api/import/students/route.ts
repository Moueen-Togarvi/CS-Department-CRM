import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { parseCsv, getDefaultDepartmentId } from '@/lib/csv-parser'
import bcrypt from 'bcryptjs'

interface ImportError {
  row: number
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const csvText: string = body.csvText

    if (!csvText || typeof csvText !== 'string') {
      return Response.json(
        { success: false, error: 'CSV text is required' },
        { status: 400 }
      )
    }

    const { headers, rows } = parseCsv(csvText)

    if (rows.length === 0) {
      return Response.json(
        { success: false, error: 'No data rows found in CSV' },
        { status: 400 }
      )
    }

    const departmentId = await getDefaultDepartmentId(db)
    const errors: ImportError[] = []
    let imported = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // +2 because header is row 1, data starts at row 2

      try {
        // Map CSV columns (flexible matching)
        const studentId = row.studentid || row.student_id || row.id || ''
        const name = row.name || ''
        const email = row.email || ''
        const gender = mapGender(row.gender || '')
        const batch = row.batch || ''
        const currentSemester = parseInt(row.currentsemester || row.semester || row.current_semester || '1', 10)
        const enrollmentYear = parseInt(row.enrollmentyear || row.enrollment_year || row.year || String(new Date().getFullYear()), 10)
        const program = row.program || 'BS'
        const guardianName = row.guardianname || row.guardian_name || row.guardian || ''
        const guardianPhone = row.guardianphone || row.guardian_phone || row.phone || ''
        const profilePicture = row.profilepicture || row.profile_picture || row.picture || row.pic || row.avatar || ''
        const fatherName = row.fathername || row.father_name || ''
        const cnic = row.cnic || row.cnic_number || row.cnicnumber || ''
        const mobileNumber = row.mobilenumber || row.mobile_number || row.mobile || row.student_mobile || ''
        const fatherPhone = row.fatherphone || row.father_phone || row.father_mobile || ''
        const session = row.session || ''
        const section = row.section || ''

        // Validation
        if (!studentId) {
          errors.push({ row: rowNum, message: 'Student ID is required' })
          continue
        }
        if (!name || name.length < 2) {
          errors.push({ row: rowNum, message: 'Name must be at least 2 characters' })
          continue
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: rowNum, message: 'Valid email is required' })
          continue
        }
        if (isNaN(currentSemester) || currentSemester < 1 || currentSemester > 12) {
          errors.push({ row: rowNum, message: 'Current semester must be 1-12' })
          continue
        }

        // Check uniqueness
        const existingStudent = await db.student.findUnique({ where: { studentId } })
        if (existingStudent) {
          errors.push({ row: rowNum, message: `Student ID "${studentId}" already exists` })
          continue
        }

        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail) {
          errors.push({ row: rowNum, message: `Email "${email}" already exists` })
          continue
        }

        // Create user + student
        const hashedPassword = await bcrypt.hash('student123', 10)

        await db.$transaction(async (tx: any) => {
          const user = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              role: 'STUDENT',
              phone: mobileNumber || guardianPhone || null,
            },
          })

          await tx.student.create({
            data: {
              userId: user.id,
              studentId,
              departmentId,
              currentSemester,
              enrollmentYear,
              batch: batch || null,
              program,
              gender: gender || null,
              guardianName: guardianName || null,
              guardianPhone: guardianPhone || null,
              profilePicture: profilePicture || null,
              fatherName: fatherName || null,
              cnic: cnic || null,
              mobileNumber: mobileNumber || null,
              fatherPhone: fatherPhone || null,
              session: session || null,
              section: section || null,
            },
          })
        })

        imported++
      } catch (err: any) {
        errors.push({ row: rowNum, message: err.message || 'Unknown error' })
      }
    }

    return Response.json({ success: true, imported, errors })
  } catch (error) {
    console.error('POST /api/import/students error:', error)
    return Response.json(
      { success: false, error: 'Import failed' },
      { status: 500 }
    )
  }
}

function mapGender(value: string): string {
  const v = (value || '').toLowerCase().trim()
  if (v === 'male' || v === 'm') return 'MALE'
  if (v === 'female' || v === 'f') return 'FEMALE'
  if (v === 'other' || v === 'o') return 'OTHER'
  return ''
}
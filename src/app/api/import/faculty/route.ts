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

    const { rows } = parseCsv(csvText)

    if (rows.length === 0) {
      return Response.json(
        { success: false, error: 'No data rows found in CSV' },
        { status: 400 }
      )
    }

    const departmentId = await getDefaultDepartmentId(db)
    const validDesignations = ['Professor', 'Assoc Professor', 'Asst Professor', 'Lecturer', 'Lab Engineer']
    const errors: ImportError[] = []
    let imported = 0

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2

      try {
        const facultyId = row.facultyid || row.faculty_id || row.id || ''
        const name = row.name || ''
        const email = row.email || ''
        const designation = mapDesignation(row.designation || row.designation || '', validDesignations)
        const specialization = row.specialization || row.specialization || row.speciality || ''
        const highestDegree = row.highestdegree || row.highest_degree || row.degree || row.qualification || ''
        const officeRoom = row.officeroom || row.office_room || row.office || ''

        if (!facultyId) {
          errors.push({ row: rowNum, message: 'Faculty ID is required' })
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

        const existingFaculty = await db.faculty.findUnique({ where: { facultyId } })
        if (existingFaculty) {
          errors.push({ row: rowNum, message: `Faculty ID "${facultyId}" already exists` })
          continue
        }

        const existingEmail = await db.user.findUnique({ where: { email } })
        if (existingEmail) {
          errors.push({ row: rowNum, message: `Email "${email}" already exists` })
          continue
        }

        const hashedPassword = await bcrypt.hash('faculty123', 10)

        await db.$transaction(async (tx: any) => {
          const user = await tx.user.create({
            data: {
              email,
              password: hashedPassword,
              name,
              role: 'FACULTY',
            },
          })

          await tx.faculty.create({
            data: {
              userId: user.id,
              facultyId,
              departmentId,
              designation: designation || 'Lecturer',
              specialization: specialization || 'General',
              highestDegree: highestDegree || 'BS',
              officeRoom: officeRoom || null,
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
    console.error('POST /api/import/faculty error:', error)
    return Response.json(
      { success: false, error: 'Import failed' },
      { status: 500 }
    )
  }
}

function mapDesignation(value: string, valid: string[]): string {
  const v = (value || '').trim().toLowerCase()

  const mapping: Record<string, string> = {
    'professor': 'Professor',
    'prof.': 'Professor',
    'assoc professor': 'Assoc Professor',
    'associate professor': 'Assoc Professor',
    'asst professor': 'Asst Professor',
    'assistant professor': 'Asst Professor',
    'lecturer': 'Lecturer',
    'lab engineer': 'Lab Engineer',
  }

  const mapped = mapping[v]
  if (mapped && valid.includes(mapped)) return mapped
  if (valid.includes(value)) return value
  return 'Lecturer'
}
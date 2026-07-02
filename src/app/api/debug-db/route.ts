import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const students = await db.student.findMany({
      select: {
        id: true,
        studentId: true,
        session: true,
        section: true,
        currentSemester: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    })

    const slots = await db.timetable.findMany({
      select: {
        id: true,
        section: true,
        day: true,
        startTime: true,
        endTime: true,
        course: {
          select: {
            code: true,
            name: true,
            semesterOffered: true,
          }
        },
        semester: {
          select: {
            name: true,
            isCurrent: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      students,
      slots,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    })
  }
}

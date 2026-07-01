import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { successResponse } from '@/lib/api-response'
import { requireAuth, handleApiError } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    const limit = Math.min(Number(searchParams.get('limit')) || 5, 10)

    if (q.length < 2) {
      return successResponse({ results: [] })
    }

    const role = session.user.role
    const results: any[] = []

    // Courses — all roles (SQLite is case-insensitive for contains by default)
    const courses = await db.course.findMany({
      where: {
        OR: [
          { code: { contains: q } },
          { name: { contains: q } },
        ],
      },
      take: limit,
      select: { id: true, code: true, name: true, creditHours: true, semesterOffered: true },
    })
    courses.forEach((c) =>
      results.push({
        type: 'course',
        id: c.id,
        title: c.name,
        subtitle: c.code,
        extra: `${c.creditHours} cr${c.semesterOffered ? ' · Sem ' + c.semesterOffered : ''}`,
        moduleId: 'courses',
      })
    )

    // Announcements — all roles
    const announcements = await db.announcement.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q } },
          { content: { contains: q } },
        ],
      },
      take: limit,
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    announcements.forEach((a) =>
      results.push({
        type: 'announcement',
        id: a.id,
        title: a.title,
        subtitle: 'Announcement',
        extra: new Date(a.createdAt).toLocaleDateString(),
        moduleId: 'announcements',
      })
    )

    // Documents — all roles
    const documents = await db.document.findMany({
      where: {
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
        ],
      },
      take: limit,
      select: { id: true, title: true, category: true },
    })
    documents.forEach((d) =>
      results.push({
        type: 'document',
        id: d.id,
        title: d.title,
        subtitle: d.category || 'Document',
        moduleId: 'documents',
      })
    )

    // Students — admin & faculty only
    if (role === 'ADMIN' || role === 'FACULTY') {
      const students = await db.student.findMany({
        where: {
          OR: [
            { studentId: { contains: q } },
            { user: { name: { contains: q } } },
          ],
        },
        take: limit,
        select: {
          id: true,
          studentId: true,
          currentSemester: true,
          section: true,
          user: { select: { name: true } },
        },
      })
      students.forEach((s) =>
        results.push({
          type: 'student',
          id: s.id,
          title: s.user.name,
          subtitle: s.studentId,
          extra: `Sem ${s.currentSemester}${s.section ? ' · ' + s.section : ''}`,
          moduleId: 'students',
        })
      )
    }

    // Faculty — admin only
    if (role === 'ADMIN') {
      const faculty = await db.faculty.findMany({
        where: {
          OR: [
            { facultyId: { contains: q } },
            { user: { name: { contains: q } } },
            { designation: { contains: q } },
          ],
        },
        take: limit,
        select: {
          id: true,
          facultyId: true,
          designation: true,
          user: { select: { name: true } },
        },
      })
      faculty.forEach((f) =>
        results.push({
          type: 'faculty',
          id: f.id,
          title: f.user.name,
          subtitle: f.facultyId,
          extra: f.designation,
          moduleId: 'faculty',
        })
      )
    }

    // Rooms — all roles
    const rooms = await db.room.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { building: { contains: q } },
        ],
      },
      take: limit,
      select: { id: true, name: true, building: true, capacity: true },
    })
    rooms.forEach((r) =>
      results.push({
        type: 'room',
        id: r.id,
        title: r.name,
        subtitle: r.building,
        extra: r.capacity ? `Cap ${r.capacity}` : '',
        moduleId: 'rooms',
      })
    )

    return successResponse({ results })
  } catch (error) {
    return handleApiError(error, 'Failed to search')
  }
}

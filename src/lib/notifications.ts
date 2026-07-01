import { db } from '@/lib/db'

/**
 * Create a notification for a user. Silently fails (never throws) so it can't
 * break the calling request flow.
 */
export async function createNotification(params: {
  userId: string
  type?: string
  title: string
  message: string
  linkUrl?: string
}) {
  try {
    await db.notification.create({
      data: {
        userId: params.userId,
        type: params.type || 'GENERAL',
        title: params.title,
        message: params.message,
        linkUrl: params.linkUrl || null,
      },
    })
  } catch {
    // notifications are best-effort
  }
}

/** Notify all users matching a role (e.g. all students). */
export async function notifyRole(
  role: 'ADMIN' | 'FACULTY' | 'STUDENT',
  data: { type?: string; title: string; message: string; linkUrl?: string }
) {
  try {
    const users = await db.user.findMany({
      where: { isActive: true, role },
      select: { id: true },
    })
    if (users.length === 0) return
    await db.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type: data.type || 'GENERAL',
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl || null,
      })),
    })
  } catch {
    // best-effort
  }
}

/** Notify all students in a given semester/section. */
export async function notifySemesterSection(
  semester: number,
  section: string | null,
  data: { type?: string; title: string; message: string; linkUrl?: string }
) {
  try {
    const students = await db.student.findMany({
      where: { currentSemester: semester, section: section || undefined, status: { not: 'INACTIVE' } },
      select: { userId: true },
    })
    if (students.length === 0) return
    await db.notification.createMany({
      data: students.map((s) => ({
        userId: s.userId,
        type: data.type || 'GENERAL',
        title: data.title,
        message: data.message,
        linkUrl: data.linkUrl || null,
      })),
    })
  } catch {
    // best-effort
  }
}

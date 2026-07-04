import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api-response";
import type { Session } from "next-auth";

/**
 * Authorization utilities (request-less; session is read from cookies).
 * Use these in Route Handlers for cleaner, uniform auth + ownership checks.
 */

export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}

export async function getSession(): Promise<Session | null> {
  return getServerSession(authOptions);
}

export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized: Please log in to continue", 401);
  }
  return session;
}

export async function requireRole(roles: string | string[]): Promise<Session> {
  const session = await requireAuth();
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(session.user.role)) {
    throw new AuthError(
      `Forbidden: Required role(s): ${allowed.join(", ")}`,
      403
    );
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  return requireRole("ADMIN");
}

export async function requireFacultyOrAdmin(): Promise<Session> {
  return requireRole(["FACULTY", "ADMIN"]);
}

export async function getFacultyForUser(userId: string) {
  return db.faculty.findUnique({ where: { userId } });
}

export async function getStudentForUser(userId: string) {
  return db.student.findUnique({ where: { userId } });
}

/**
 * Ensure the logged-in faculty owns the given course+semester.
 * Ownership = a CourseOffering (Phase 1), a Timetable slot, OR Course.instructorId.
 */
export async function assertFacultyOwnsCourse(
  userId: string,
  courseId: string,
  semesterId?: string
) {
  const faculty = await getFacultyForUser(userId);
  if (!faculty) {
    throw new AuthError("Faculty profile not found", 403);
  }

  const [offering, timetableSlot, asInstructor] = await Promise.all([
    db.courseOffering
      .findFirst({
        where: { facultyId: faculty.id, courseId, ...(semesterId ? { semesterId } : {}) },
      })
      .catch(() => null),
    db.timetable.findFirst({
      where: { facultyId: faculty.id, courseId, ...(semesterId ? { semesterId } : {}) },
    }),
    db.course.findFirst({ where: { id: courseId, instructorId: faculty.id } }),
  ]);

  if (!offering && !timetableSlot && !asInstructor) {
    throw new AuthError("You are not assigned to this course", 403);
  }
  return faculty;
}

/**
 * Return the sections a faculty may access for a given course+semester.
 * - string[] : restricted to these specific sections (from CourseOfferings/Timetables)
 * - null     : no section restriction (legacy Course.instructorId fallback)
 * Callers should verify ownership (assertFacultyOwnsCourse) beforehand.
 */
export async function getFacultyCourseSections(
  userId: string,
  courseId: string,
  semesterId?: string
): Promise<string[] | null> {
  const faculty = await getFacultyForUser(userId)
  if (!faculty) return null

  const semFilter = semesterId ? { semesterId } : {}
  const [offerings, timetables, asInstructor] = await Promise.all([
    db.courseOffering
      .findMany({
        where: { facultyId: faculty.id, courseId, ...semFilter, isActive: true },
        select: { section: true },
      })
      .catch(() => []),
    db.timetable
      .findMany({
        where: { facultyId: faculty.id, courseId, ...semFilter },
        select: { section: true },
      })
      .catch(() => []),
    db.course.findFirst({ where: { id: courseId, instructorId: faculty.id } }),
  ])

  const sections = new Set<string>()
  for (const o of offerings) if (o.section) sections.add(o.section)
  for (const t of timetables) if (t.section) sections.add(t.section)

  if (sections.size > 0) return Array.from(sections)
  // Legacy fallback: direct instructor with no section-based assignment → all sections
  if (asInstructor) return null
  return null
}

/**
 * Get the faculty's allowed semester+section scope.
 * Returns Map<semester, string[] | null> where null = all sections for that semester.
 * Returns null for non-faculty (no restriction).
 * Returns empty Map for faculty with no assignments.
 *
 * Section values come from CourseOffering.section and Timetable.section.
 * If faculty is a Course.instructorId but has no CourseOffering/Timetable,
 * the semester gets null (all sections) as a fallback.
 */
export async function getFacultySectionScope(
  session: Session
): Promise<Map<number, string[] | null> | null> {
  if (session.user.role !== "FACULTY") return null;

  const faculty = await getFacultyForUser(session.user.id);
  if (!faculty) return new Map();

  const [offerings, timetableSlots, instructorCourses] = await Promise.all([
    db.courseOffering.findMany({
      where: { facultyId: faculty.id, isActive: true },
      include: { course: { select: { semesterOffered: true } } },
    }),
    db.timetable.findMany({
      where: { facultyId: faculty.id },
      include: { course: { select: { semesterOffered: true } } },
    }),
    db.course.findMany({
      where: { instructorId: faculty.id, isActive: true },
      select: { semesterOffered: true },
    }),
  ]);

  const scope = new Map<number, string[] | null>();
  const sectionMap = new Map<number, Set<string>>();

  for (const o of offerings) {
    if (o.course.semesterOffered != null) {
      if (!sectionMap.has(o.course.semesterOffered))
        sectionMap.set(o.course.semesterOffered, new Set());
      sectionMap.get(o.course.semesterOffered)!.add(o.section);
    }
  }
  for (const t of timetableSlots) {
    if (t.course.semesterOffered != null) {
      if (!sectionMap.has(t.course.semesterOffered))
        sectionMap.set(t.course.semesterOffered, new Set());
      sectionMap.get(t.course.semesterOffered)!.add(t.section);
    }
  }
  for (const [sem, secs] of sectionMap) {
    scope.set(sem, Array.from(secs));
  }

  for (const c of instructorCourses) {
    if (c.semesterOffered != null && !scope.has(c.semesterOffered)) {
      scope.set(c.semesterOffered, null);
    }
  }

  return scope;
}

/**
 * Convert a faculty section scope into a Prisma where-input fragment.
 * Returns empty object for no restriction (admin).
 */
export function scopeToWhere(
  scope: Map<number, string[] | null> | null
): Record<string, unknown> {
  if (scope === null) return {};
  if (scope.size === 0) return { currentSemester: -1 };
  return {
    OR: Array.from(scope.entries()).map(([sem, secs]) =>
      secs === null
        ? { currentSemester: sem }
        : { currentSemester: sem, section: { in: secs } }
    ),
  };
}

/** Ensure a student is only accessing their own data; returns their student.id. */
export async function getSelfStudentId(userId: string): Promise<string> {
  const student = await getStudentForUser(userId);
  if (!student) {
    throw new AuthError("Student profile not found", 403);
  }
  return student.id;
}

/**
 * Ensure the requester may view a given student's data.
 * Admin/Faculty => allowed. Student => must be self.
 */
export async function assertCanViewStudent(
  session: Session,
  studentId: string
): Promise<void> {
  if (session.user.role === "ADMIN" || session.user.role === "FACULTY") return;
  const selfId = await getSelfStudentId(session.user.id);
  if (selfId !== studentId) {
    throw new AuthError("Forbidden: You can only view your own records", 403);
  }
}

/** Convert thrown errors into the standard API error envelope. */
export function handleApiError(error: unknown, fallbackMessage = "Request failed") {
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode);
  }
  console.error(fallbackMessage + ":", error);
  return errorResponse(fallbackMessage, 500);
}

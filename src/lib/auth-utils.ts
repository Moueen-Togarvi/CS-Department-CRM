import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/api-response";
import type { Session } from "next-auth";
import { AuthError } from "@/lib/auth-error";

/**
 * Authorization utilities (request-less; session is read from cookies).
 * Use these in Route Handlers for cleaner, uniform auth + ownership checks.
 */

export { AuthError } from "@/lib/auth-error";

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
 *
 * Ownership means a CourseOffering or a Timetable slot — the two records that
 * actually say which sections someone teaches.
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

  const [offering, timetableSlot] = await Promise.all([
    db.courseOffering
      .findFirst({
        where: { facultyId: faculty.id, courseId, ...(semesterId ? { semesterId } : {}) },
      })
      .catch(() => null),
    db.timetable.findFirst({
      where: { facultyId: faculty.id, courseId, ...(semesterId ? { semesterId } : {}) },
    }),
  ]);

  if (!offering && !timetableSlot) {
    throw new AuthError("You are not assigned to this course", 403);
  }
  return faculty;
}

/**
 * Return the sections a faculty may access for a given course+semester.
 * An empty array means they are assigned to nothing, so callers must deny.
 * Callers should verify ownership (assertFacultyOwnsCourse) beforehand.
 */
export async function getFacultyCourseSections(
  userId: string,
  courseId: string,
  semesterId?: string
): Promise<string[]> {
  const faculty = await getFacultyForUser(userId)
  if (!faculty) return []

  const semFilter = semesterId ? { semesterId } : {}
  const [offerings, timetables] = await Promise.all([
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
  ])

  const sections = new Set<string>()
  for (const o of offerings) if (o.section) sections.add(o.section)
  for (const t of timetables) if (t.section) sections.add(t.section)

  // An empty array means assigned to nothing, and callers must deny.
  return Array.from(sections)
}

/** What a caller is allowed to see, plus the Prisma filter that enforces it. */
export interface SectionScope {
  /** The single section in play, when there is exactly one. */
  section?: string
  /** Spread into a Prisma `where` to constrain the `section` column. */
  where: Record<string, unknown>
}

/**
 * Resolve which section(s) a request may touch for a course.
 *
 * Admins are unrestricted. A faculty member is limited to the sections they
 * hold an offering or timetable slot for — including when no section is
 * requested, which previously fell through to *every* section of the course.
 * Faculty with no assignment are refused rather than granted everything.
 *
 * Callers should have already established course ownership.
 */
export async function resolveSectionScope(
  session: Session,
  courseId: string,
  semesterId: string | undefined,
  requestedSection: string | undefined
): Promise<SectionScope> {
  const unrestricted = (): SectionScope =>
    requestedSection
      ? { section: requestedSection, where: { section: requestedSection } }
      : { where: {} }

  if (session.user.role !== "FACULTY") return unrestricted()

  const allowed = await getFacultyCourseSections(session.user.id, courseId, semesterId)
  if (allowed.length === 0) {
    throw new AuthError(
      "Forbidden: You are not assigned to any section of this course",
      403
    )
  }

  if (requestedSection) {
    if (!allowed.includes(requestedSection)) {
      throw new AuthError("Forbidden: You are not assigned to this section", 403)
    }
    return { section: requestedSection, where: { section: requestedSection } }
  }

  return {
    section: allowed.length === 1 ? allowed[0] : undefined,
    where: { section: { in: allowed } },
  }
}

/**
 * Get the faculty's allowed semester+section scope.
 * Returns Map<semester, string[] | null> where null = all sections for that semester.
 * Returns null for non-faculty (no restriction).
 * Returns empty Map for faculty with no assignments.
 *
 * Section values come from CourseOffering.section and Timetable.section.
 */
export async function getFacultySectionScope(
  session: Session
): Promise<Map<number, string[] | null> | null> {
  if (session.user.role !== "FACULTY") return null;

  const faculty = await getFacultyForUser(session.user.id);
  if (!faculty) return new Map();

  const [offerings, timetableSlots] = await Promise.all([
    db.courseOffering.findMany({
      where: { facultyId: faculty.id, isActive: true },
      include: { course: { select: { semesterOffered: true } } },
    }),
    db.timetable.findMany({
      where: { facultyId: faculty.id },
      include: { course: { select: { semesterOffered: true } } },
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

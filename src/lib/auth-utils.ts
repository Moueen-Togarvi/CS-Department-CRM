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

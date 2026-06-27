import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        student: {
          include: {
            department: true,
          },
        },
        faculty: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      student: user.student
        ? {
            id: user.student.id,
            studentId: user.student.studentId,
            currentSemester: user.student.currentSemester,
            enrollmentYear: user.student.enrollmentYear,
            batch: user.student.batch,
            program: user.student.program,
            status: user.student.status,
            gpa: user.student.gpa,
            totalCredits: user.student.totalCredits,
            dateOfBirth: user.student.dateOfBirth,
            gender: user.student.gender,
            address: user.student.address,
            guardianName: user.student.guardianName,
            guardianPhone: user.student.guardianPhone,
            emergencyContact: user.student.emergencyContact,
            department: user.student.department
              ? {
                  id: user.student.department.id,
                  name: user.student.department.name,
                  code: user.student.department.code,
                }
              : null,
          }
        : null,
      faculty: user.faculty
        ? {
            id: user.faculty.id,
            facultyId: user.faculty.facultyId,
            designation: user.faculty.designation,
            specialization: user.faculty.specialization,
            highestDegree: user.faculty.highestDegree,
            joiningDate: user.faculty.joiningDate,
            officeRoom: user.faculty.officeRoom,
            officeHours: user.faculty.officeHours,
            bio: user.faculty.bio,
            isAvailable: user.faculty.isAvailable,
            department: user.faculty.department
              ? {
                  id: user.faculty.department.id,
                  name: user.faculty.department.name,
                  code: user.faculty.department.code,
                }
              : null,
          }
        : null,
    };

    return NextResponse.json({
      session,
      user: profile,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to get session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
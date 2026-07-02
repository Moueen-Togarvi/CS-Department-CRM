const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
async function run() {
  const students = await db.student.findMany({
    select: {
      id: true,
      studentId: true,
      currentSemester: true,
      shift: true,
      section: true,
      user: { select: { name: true } }
    }
  })
  console.log("Students:", students)
  
  const slots = await db.timetable.findMany({
    select: {
      id: true,
      section: true,
      day: true,
      startTime: true,
      endTime: true,
      course: { select: { code: true, name: true, semesterOffered: true } },
      semester: { select: { name: true, isCurrent: true } }
    }
  })
  console.log("Slots:", slots)
}
run().catch(console.error).finally(() => db.$disconnect())

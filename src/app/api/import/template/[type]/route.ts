import { NextRequest } from 'next/server'

const TEMPLATES: Record<string, string> = {
  students:
    'studentId,name,email,gender,batch,currentSemester,enrollmentYear,program,guardianName,guardianPhone',
  faculty:
    'facultyId,name,email,designation,specialization,highestDegree,officeRoom',
  courses:
    'code,name,creditHours,labCreditHours,courseType,semesterOffered,description',
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params
  const template = TEMPLATES[type]

  if (!template) {
    return new Response('Invalid template type', { status: 400 })
  }

  const exampleRows: Record<string, string> = {
    students: `\nCS-2025-001,Ahmed Khan,ahmed@csdept.edu,MALE,Batch-2025,1,2025,BS,Muhammad Khan,0300-1234567\nCS-2025-002,Fatima Ali,fatima@csdept.edu,FEMALE,Batch-2025,1,2025,BS,Ali Hassan,0301-9876543`,
    faculty: `\nF-001,Dr. Muhammad Ali,ali@csdept.edu,Professor,Machine Learning,PhD,Room-101\nF-002,Dr. Sara Ahmed,sara@csdept.edu,Assoc Professor,Data Science,PhD,Room-202`,
    courses: `\nCS101,Introduction to Programming,3,0,THEORY,1,Fundamentals of programming\nCS102,Programming Lab,0,1,LAB,1,Hands-on programming practice`,
  }

  const csvContent = template + (exampleRows[type] || '')

  return new Response(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${type}-template.csv"`,
    },
  })
}
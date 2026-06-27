import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { createLLM } = await import('z-ai-web-dev-sdk')
    const llm = createLLM()

    const body = await request.json()
    const { text, entityType } = body

    if (!text || !entityType) {
      return NextResponse.json(
        { success: false, error: 'text and entityType are required' },
        { status: 400 }
      )
    }

    const fieldDescriptions: Record<string, string> = {
      student: `{
  "name": "full name string",
  "email": "email address (infer from name if not provided, use format: firstname@csdept.edu)",
  "studentId": "student ID if mentioned",
  "gender": "MALE, FEMALE, or OTHER",
  "batch": "batch identifier, e.g. Batch-2025",
  "currentSemester": "semester number (1-12)",
  "enrollmentYear": "4-digit year",
  "program": "BS, MS, or PhD (default BS)",
  "guardianName": "father/guardian name if mentioned",
  "guardianPhone": "guardian phone number if mentioned",
  "phone": "student phone number if mentioned"
}`,
      faculty: `{
  "name": "full name with title (e.g. Dr. Muhammad Ali)",
  "email": "email address (infer from name if not provided)",
  "facultyId": "faculty ID if mentioned",
  "designation": "Professor, Assoc Professor, Asst Professor, Lecturer, or Lab Engineer",
  "specialization": "area of specialization",
  "highestDegree": "PhD, MS, BS etc.",
  "officeRoom": "room number if mentioned"
}`,
      course: `{
  "code": "course code (e.g. CS301)",
  "name": "full course name",
  "creditHours": "number (default 3)",
  "labCreditHours": "number (default 0)",
  "courseType": "THEORY, LAB, PROJECT, or SEMINAR",
  "semesterOffered": "semester number if mentioned",
  "description": "brief description"
}`,
    }

    const response = await llm.chat({
      messages: [
        {
          role: 'system',
          content: `You are a data extraction assistant for a university CS department management system.
Extract structured data from natural language descriptions of ${entityType} records.
Return ONLY a JSON object with this exact structure:
{
  "data": ${fieldDescriptions[entityType]},
  "confidence": 0.0-1.0
}
Rules:
- Use null for fields that cannot be determined from the text
- Infer email from name if not provided (format: firstnamelastname@csdept.edu)
- Default program to "BS" for students
- Default creditHours to 3 for courses
- Default courseType to "THEORY"
- Default designation to "Lecturer" for faculty
- Return valid JSON only, no markdown, no explanation`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    })

    const content = typeof response === 'string' ? response : (response as any).content || JSON.stringify(response)

    let parsed: any
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'AI returned invalid format',
      })
    }

    return NextResponse.json({
      success: true,
      data: parsed.data || {},
      confidence: parsed.confidence || 0.5,
    })
  } catch (error) {
    console.error('POST /api/ai/smart-entry error:', error)
    return NextResponse.json(
      { success: false, error: 'AI service unavailable' },
      { status: 503 }
    )
  }
}
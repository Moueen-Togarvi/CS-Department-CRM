import { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { createLLM } = await import('z-ai-web-dev-sdk')
    const llm = createLLM()

    const body = await request.json()
    const { csvText, entityType } = body

    if (!csvText || !entityType) {
      return NextResponse.json(
        { success: false, error: 'csvText and entityType are required' },
        { status: 400 }
      )
    }

    const fieldDescriptions: Record<string, string> = {
      student:
        'studentId, name, email, gender (MALE/FEMALE/OTHER), batch (e.g. Batch-2025), currentSemester (number 1-12), enrollmentYear (number), program (BS/MS/PhD), guardianName, guardianPhone',
      faculty:
        'facultyId, name, email, designation (Professor/Assoc Professor/Asst Professor/Lecturer/Lab Engineer), specialization, highestDegree, officeRoom',
      course:
        'code (e.g. CS101), name, creditHours (number), labCreditHours (number), courseType (THEORY/LAB/PROJECT/SEMINAR), semesterOffered (number), description',
    }

    const response = await llm.chat({
      messages: [
        {
          role: 'system',
          content: `You are a data extraction assistant for a university CS department management system. 
Parse the provided CSV text into structured JSON records. Each record should have these fields: ${fieldDescriptions[entityType]}.
Return ONLY a JSON object with this structure: { "records": [...], "columnMapping": {...}, "confidence": 0.0-1.0 }
The records array should contain objects with the extracted fields. The columnMapping should show which CSV columns map to which fields.
If the CSV has messy or inconsistent headers, try to intelligently map them.
Use null for fields that cannot be determined. Return valid JSON only, no markdown.`,
        },
        {
          role: 'user',
          content: `Parse this ${entityType} CSV data:\n\n${csvText}`,
        },
      ],
    })

    const content = typeof response === 'string' ? response : (response as any).content || JSON.stringify(response)

    // Try to parse the AI response as JSON
    let parsed: any
    try {
      // Handle potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({
        success: true,
        records: [],
        columnMapping: {},
        confidence: 0,
        error: 'AI returned invalid JSON. Please check your data format.',
      })
    }

    return NextResponse.json({
      success: true,
      records: parsed.records || [],
      columnMapping: parsed.columnMapping || {},
      confidence: parsed.confidence || 0.5,
    })
  } catch (error) {
    console.error('POST /api/ai/parse-csv error:', error)
    return NextResponse.json(
      { success: false, error: 'AI service unavailable' },
      { status: 503 }
    )
  }
}
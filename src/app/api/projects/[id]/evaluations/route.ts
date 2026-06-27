import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'
import { NextRequest } from 'next/server'
import { EvaluationType } from '@prisma/client'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { evaluationType, criteriaScores, totalScore, comments, evaluatorId } = body

    if (!evaluationType || !evaluatorId) {
      return errorResponse('Evaluation type and evaluator are required')
    }

    if (!Object.values(EvaluationType).includes(evaluationType)) {
      return errorResponse('Invalid evaluation type')
    }

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return errorResponse('Project not found', 404)
    }

    // Check for existing evaluation of same type
    const existing = await db.fYPEvaluation.findFirst({
      where: { projectId: id, evaluationType },
    })

    if (existing) {
      // Update existing
      const updated = await db.fYPEvaluation.update({
        where: { id: existing.id },
        data: {
          evaluatorId,
          criteriaScores: typeof criteriaScores === 'string' ? criteriaScores : JSON.stringify(criteriaScores),
          totalScore: totalScore ? Number(totalScore) : null,
          comments: comments || null,
          evaluatedAt: new Date(),
        },
        include: {
          evaluator: { select: { user: { select: { name: true } } } },
        },
      })
      return successResponse({ ...updated, evaluatorName: updated.evaluator.user.name })
    }

    const evaluation = await db.fYPEvaluation.create({
      data: {
        projectId: id,
        evaluatorId,
        evaluationType,
        criteriaScores: typeof criteriaScores === 'string' ? criteriaScores : JSON.stringify(criteriaScores || {}),
        totalScore: totalScore ? Number(totalScore) : null,
        comments: comments || null,
        evaluatedAt: new Date(),
      },
      include: {
        evaluator: { select: { user: { select: { name: true } } } },
      },
    })

    return successResponse(
      { ...evaluation, evaluatorName: evaluation.evaluator.user.name },
      'Evaluation submitted',
      201
    )
  } catch (error) {
    console.error('Submit evaluation error:', error)
    return errorResponse('Error submitting evaluation', 500)
  }
}
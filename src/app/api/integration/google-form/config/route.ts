import { NextRequest } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/auth-utils'
import { successResponse } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  try {
    // Only administrators should access this config
    await requireAdmin()

    const secretToken = process.env.GOOGLE_FORM_SECRET_TOKEN || 'CS_CRM_Form_Secret_2026!'
    
    return successResponse({
      secretToken,
    })
  } catch (error: any) {
    return handleApiError(error)
  }
}

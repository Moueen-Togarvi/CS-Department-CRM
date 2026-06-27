import { NextResponse } from 'next/server'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export function successResponse<T>(data: T, message?: string, status: number = 200) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    message,
  }, { status })
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json<ApiResponse>({
    success: false,
    error: message,
  }, { status })
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
) {
  return NextResponse.json<PaginatedResponse<T>>({
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
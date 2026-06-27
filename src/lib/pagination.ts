import type { PaginationParams } from '@/types/api'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function parsePaginationParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): PaginationParams {
  const params = searchParams instanceof URLSearchParams
    ? Object.fromEntries(searchParams.entries())
    : (searchParams as Record<string, string>)

  let page = parseInt(params.page || '') || DEFAULT_PAGE
  let limit = parseInt(params.limit || '') || DEFAULT_LIMIT

  if (page < 1) page = DEFAULT_PAGE
  if (limit < 1) limit = DEFAULT_LIMIT
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  return {
    page,
    limit,
    search: params.search || params.q || undefined,
    sort: params.sort || 'createdAt',
    order: (params.order as 'asc' | 'desc') || 'desc',
  }
}

export function skipTake(page: number, limit: number) {
  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}
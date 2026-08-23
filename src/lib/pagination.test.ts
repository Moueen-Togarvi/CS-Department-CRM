import { describe, expect, it } from 'vitest'
import { parsePaginationParams, skipTake } from './pagination'

describe('parsePaginationParams', () => {
  it('applies defaults when nothing is supplied', () => {
    expect(parsePaginationParams(new URLSearchParams())).toMatchObject({
      page: 1,
      limit: 20,
      sort: 'createdAt',
      order: 'desc',
    })
  })

  it('reads page and limit from the query string', () => {
    const p = parsePaginationParams(new URLSearchParams('page=3&limit=50'))
    expect(p).toMatchObject({ page: 3, limit: 50 })
  })

  // Without this an attacker could ask for a million rows in one request.
  it('caps limit at 100', () => {
    expect(parsePaginationParams(new URLSearchParams('limit=100000')).limit).toBe(100)
  })

  it('falls back to defaults for junk, zero and negative values', () => {
    expect(parsePaginationParams(new URLSearchParams('page=abc')).page).toBe(1)
    expect(parsePaginationParams(new URLSearchParams('page=0')).page).toBe(1)
    expect(parsePaginationParams(new URLSearchParams('page=-5')).page).toBe(1)
    expect(parsePaginationParams(new URLSearchParams('limit=-1')).limit).toBe(20)
  })

  it('accepts either search or q', () => {
    expect(parsePaginationParams(new URLSearchParams('search=ali')).search).toBe('ali')
    expect(parsePaginationParams(new URLSearchParams('q=ali')).search).toBe('ali')
  })

  it('accepts a plain object as well as URLSearchParams', () => {
    expect(parsePaginationParams({ page: '2', limit: '10' })).toMatchObject({ page: 2, limit: 10 })
  })
})

describe('skipTake', () => {
  it('converts a page number into an offset', () => {
    expect(skipTake(1, 20)).toEqual({ skip: 0, take: 20 })
    expect(skipTake(3, 20)).toEqual({ skip: 40, take: 20 })
  })
})

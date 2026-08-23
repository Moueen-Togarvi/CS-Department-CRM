import { describe, expect, it } from 'vitest'
import { parseCsv } from './csv-parser'

describe('parseCsv', () => {
  it('normalises headers to snake_case keys', () => {
    const { headers, rows } = parseCsv('Student ID,Full Name\n1,Ali')
    expect(headers).toEqual(['student_id', 'full_name'])
    expect(rows[0]).toEqual({ student_id: '1', full_name: 'Ali' })
  })

  it('handles quoted fields containing commas', () => {
    const { rows } = parseCsv('name,address\n"Ali","12 Mall Rd, Lahore"')
    expect(rows[0].address).toBe('12 Mall Rd, Lahore')
  })

  it('unescapes doubled quotes', () => {
    const { rows } = parseCsv('name\n"He said ""hi"""')
    expect(rows[0].name).toBe('He said "hi"')
  })

  it('accepts CRLF line endings from Excel exports', () => {
    const { rows } = parseCsv('a,b\r\n1,2\r\n3,4')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toEqual({ a: '3', b: '4' })
  })

  it('skips blank lines rather than emitting empty rows', () => {
    const { rows } = parseCsv('a,b\n1,2\n\n3,4\n')
    expect(rows).toHaveLength(2)
  })

  it('fills missing trailing columns with empty strings', () => {
    const { rows } = parseCsv('a,b,c\n1,2')
    expect(rows[0]).toEqual({ a: '1', b: '2', c: '' })
  })

  it('trims surrounding whitespace from values', () => {
    const { rows } = parseCsv('a,b\n  1  ,  2  ')
    expect(rows[0]).toEqual({ a: '1', b: '2' })
  })

  it('returns headers but no rows for a header-only file', () => {
    const { headers, rows } = parseCsv('a,b')
    expect(headers).toEqual(['a', 'b'])
    expect(rows).toEqual([])
  })

  // Documents current behaviour: an empty upload yields one empty header,
  // not a crash — the import routes reject it before reaching the database.
  it('does not throw on empty input', () => {
    expect(() => parseCsv('')).not.toThrow()
    expect(parseCsv('').rows).toEqual([])
  })
})

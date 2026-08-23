import { describe, expect, it } from 'vitest'
import {
  canRenderInline,
  isAllowedMimeType,
  safeContentType,
  safeFilename,
} from './upload-safety'

describe('isAllowedMimeType', () => {
  it('accepts the document and image types the app actually uses', () => {
    expect(isAllowedMimeType('image/png')).toBe(true)
    expect(isAllowedMimeType('application/pdf')).toBe(true)
    expect(isAllowedMimeType('text/csv')).toBe(true)
  })

  // The whole point of the allowlist: these execute script on our own origin.
  it('rejects HTML and SVG', () => {
    expect(isAllowedMimeType('text/html')).toBe(false)
    expect(isAllowedMimeType('image/svg+xml')).toBe(false)
    expect(isAllowedMimeType('application/xhtml+xml')).toBe(false)
  })

  it('is case-insensitive and ignores charset parameters', () => {
    expect(isAllowedMimeType('IMAGE/PNG')).toBe(true)
    expect(isAllowedMimeType('text/csv; charset=utf-8')).toBe(true)
  })

  it('does not let a parameter smuggle a disallowed type through', () => {
    expect(isAllowedMimeType('text/html; charset=utf-8')).toBe(false)
  })
})

describe('canRenderInline', () => {
  it('allows images and PDFs to render in the tab', () => {
    expect(canRenderInline('image/jpeg')).toBe(true)
    expect(canRenderInline('application/pdf')).toBe(true)
  })

  it('forces everything else to download', () => {
    expect(canRenderInline('text/csv')).toBe(false)
    expect(canRenderInline('application/msword')).toBe(false)
    expect(canRenderInline('text/html')).toBe(false)
  })
})

describe('safeContentType', () => {
  // Rows written before the allowlist existed can still hold text/html.
  it('neutralises a stored type that is no longer allowed', () => {
    expect(safeContentType('text/html')).toBe('application/octet-stream')
    expect(safeContentType('image/svg+xml')).toBe('application/octet-stream')
  })

  it('passes through an allowed type unchanged', () => {
    expect(safeContentType('image/png')).toBe('image/png')
  })
})

describe('safeFilename', () => {
  it('strips characters that would break out of the header', () => {
    expect(safeFilename('a"b')).toBe('a_b')
    expect(safeFilename('a\r\nb')).toBe('a__b')
    expect(safeFilename('../../etc/passwd')).toBe('.._.._etc_passwd')
  })

  it('falls back to a name when the input is empty', () => {
    expect(safeFilename('')).toBe('download')
  })

  it('caps the length', () => {
    expect(safeFilename('x'.repeat(500))).toHaveLength(200)
  })
})

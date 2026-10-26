/**
 * Upload allowlist.
 *
 * The stored MIME type is whatever the browser sent, and the file is served
 * back from this app's own origin — so an HTML or SVG upload rendered inline
 * would execute script as the signed-in user. Only these types are accepted,
 * and only images and PDFs are ever served inline.
 */
export const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
])

/** Types safe to render in the browser tab. Everything else downloads. */
const INLINE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
])

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase().split(';')[0].trim())
}

export function matchesFileSignature(mimeType: string, data: Uint8Array): boolean {
  const type = mimeType.toLowerCase().split(';')[0].trim()
  const starts = (...bytes: number[]) => bytes.every((byte, index) => data[index] === byte)
  switch (type) {
    case 'image/png': return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
    case 'image/jpeg': return starts(0xff, 0xd8, 0xff)
    case 'image/gif': return Buffer.from(data.subarray(0, 6)).toString('ascii').match(/^GIF8[79]a$/) !== null
    case 'image/webp': return Buffer.from(data.subarray(0, 4)).toString('ascii') === 'RIFF' && Buffer.from(data.subarray(8, 12)).toString('ascii') === 'WEBP'
    case 'application/pdf': return Buffer.from(data.subarray(0, 5)).toString('ascii') === '%PDF-'
    case 'application/msword':
    case 'application/vnd.ms-excel':
    case 'application/vnd.ms-powerpoint': return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation': return starts(0x50, 0x4b, 0x03, 0x04)
    case 'text/plain':
    case 'text/csv': {
      const sample = data.subarray(0, 8192)
      if (starts(0xff, 0xfe) || starts(0xfe, 0xff)) return true
      try { new TextDecoder('utf-8', { fatal: true }).decode(sample); return true }
      catch { return false }
    }
    default: return false
  }
}

export function canRenderInline(mimeType: string): boolean {
  return INLINE_MIME_TYPES.has(mimeType.toLowerCase().split(';')[0].trim())
}

/**
 * Never echo a stored MIME type back unchecked — a row written before the
 * allowlist existed could still carry `text/html`.
 */
export function safeContentType(mimeType: string): string {
  return isAllowedMimeType(mimeType) ? mimeType : 'application/octet-stream'
}

/** Strip path separators and quotes so the filename can't break the header. */
export function safeFilename(filename: string): string {
  return filename.replace(/[\\/\r\n"]/g, '_').slice(0, 200) || 'download'
}

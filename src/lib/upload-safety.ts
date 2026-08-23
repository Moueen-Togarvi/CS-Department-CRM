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

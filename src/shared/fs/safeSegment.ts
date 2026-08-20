/** IDs used as directory names under userData (groupId, etc.). */
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,126}$/

export function isSafePathSegment(value: string): boolean {
  return SAFE_ID.test(value) && !value.includes('..')
}

export function assertSafePathSegment(value: string, label = 'id'): void {
  if (!isSafePathSegment(value)) {
    throw new Error(`${label} is not a safe path segment`)
  }
}

/** File basename for copies under files/{groupId}/ — allow unicode, reject traversal. */
export function assertSafeFileName(name: string): void {
  if (!name || name === '.' || name === '..') {
    throw new Error('file name is not allowed')
  }
  if (name.includes('\0') || name.includes('/') || name.includes('\\') || name.includes('..')) {
    throw new Error('file name is not allowed')
  }
}

export function rejectRendererUploadPath(filePath: unknown): void {
  if (filePath == null || filePath === '') return
  throw new Error('renderer filePath not allowed')
}

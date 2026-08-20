/** Extension API v0.5 — file.upload (Host file picker; plugin must not pass a path) */
export const FILE_UPLOAD_WHITELIST_FIELDS = ['groupId'] as const

export type FileUploadWhitelistField = (typeof FILE_UPLOAD_WHITELIST_FIELDS)[number]

const WHITELIST_SET = new Set<string>(FILE_UPLOAD_WHITELIST_FIELDS)

/** Host-enforced max upload size (bytes) for plugin-initiated uploads. */
export const FILE_UPLOAD_MAX_BYTES = 200 * 1024 * 1024

export function getDisallowedFileUploadFields(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((key) => !WHITELIST_SET.has(key))
}

export type ParsedFileUpload =
  | { ok: true; value: { groupId: string } }
  | { ok: false; message: string }

export function parseFileUploadInput(input: unknown): ParsedFileUpload {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'upload input object required' }
  }
  const body = input as Record<string, unknown>
  const disallowed = getDisallowedFileUploadFields(body)
  if (disallowed.length > 0) {
    return { ok: false, message: `upload field not allowed: ${disallowed.join(', ')}` }
  }
  const groupId = body.groupId
  if (typeof groupId !== 'string' || !groupId.trim()) {
    return { ok: false, message: 'groupId required' }
  }
  return {
    ok: true,
    value: {
      groupId: groupId.trim()
    }
  }
}

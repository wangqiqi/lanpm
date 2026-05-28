import { randomBytes } from 'crypto'

/** docs/01 §3.2 — suffix `-yymm` (e.g. `-2401`) */
export function formatSuffix(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  return `-${yy}${mm}`
}

/** ASCII slug for userId; non-Latin names get a stable random prefix. */
export function toUserIdSlug(baseName: string): string {
  const ascii = baseName
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  if (ascii.length >= 2) return ascii
  return `u${randomBytes(4).toString('hex')}`
}

export function newDeviceId(): string {
  return `dev_${randomBytes(6).toString('hex')}`
}

export interface AllocatedUserId {
  userId: string
  suffix?: string
  displayName: string
}

const USER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$/

export function isValidUserId(userId: string): boolean {
  return USER_ID_PATTERN.test(userId)
}

/** Local + optional LAN-wide uniqueness via `exists` callback. */
export function allocateUserId(
  baseName: string,
  exists: (userId: string) => boolean,
  now: Date = new Date()
): AllocatedUserId {
  const slug = toUserIdSlug(baseName)
  if (!exists(slug)) {
    return { userId: slug, displayName: baseName }
  }

  const suffix = formatSuffix(now)
  const withSuffix = `${slug}${suffix}`
  if (!exists(withSuffix)) {
    return { userId: withSuffix, suffix, displayName: `${baseName}${suffix}` }
  }

  let n = 2
  while (n < 100) {
    const candidate = `${withSuffix}-${n}`
    if (!exists(candidate)) {
      return { userId: candidate, suffix: `${suffix}-${n}`, displayName: `${baseName}${suffix}-${n}` }
    }
    n += 1
  }

  const fallback = `${slug}-${randomBytes(3).toString('hex')}`
  return { userId: fallback, displayName: `${baseName}-${fallback.slice(slug.length + 1)}` }
}

export interface ManualUserIdValidation {
  ok: boolean
  reason?: string
}

/** Manual userId / suffix edit — docs/01 §3.2, docs/03 §16.1 */
export function validateManualUserId(
  userId: string,
  exists: (id: string) => boolean
): ManualUserIdValidation {
  const trimmed = userId.trim()
  if (!trimmed) return { ok: false, reason: '用户 ID 不能为空' }
  if (!isValidUserId(trimmed)) {
    return { ok: false, reason: '仅允许小写字母、数字、连字符与下划线（2–64 字符）' }
  }
  if (exists(trimmed)) {
    return { ok: false, reason: '该 ID 已被占用（本机或局域网）' }
  }
  return { ok: true }
}

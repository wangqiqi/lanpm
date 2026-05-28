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

/** Local uniqueness only (M0-07 will add LAN-wide checks). */
export function allocateUserId(
  baseName: string,
  exists: (userId: string) => boolean
): AllocatedUserId {
  const slug = toUserIdSlug(baseName)
  if (!exists(slug)) {
    return { userId: slug, displayName: baseName }
  }

  const suffix = formatSuffix(new Date())
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

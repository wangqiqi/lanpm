import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

export const IDENTITY_REBIND_HINT_FILE = 'identity_rebind_hint.json'

export interface IdentityRebindHint {
  userId: string
  deviceId: string
}

export function readRebindHint(rootUserDataPath: string): IdentityRebindHint | null {
  const path = join(rootUserDataPath, IDENTITY_REBIND_HINT_FILE)
  if (!existsSync(path)) return null
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as IdentityRebindHint
    if (typeof parsed.userId === 'string' && typeof parsed.deviceId === 'string') {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function writeRebindHint(rootUserDataPath: string, hint: IdentityRebindHint): void {
  writeFileSync(
    join(rootUserDataPath, IDENTITY_REBIND_HINT_FILE),
    JSON.stringify(hint satisfies IdentityRebindHint),
    'utf8'
  )
}

export function clearRebindHint(rootUserDataPath: string): void {
  const path = join(rootUserDataPath, IDENTITY_REBIND_HINT_FILE)
  if (existsSync(path)) unlinkSync(path)
}

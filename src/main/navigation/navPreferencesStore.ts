import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import {
  DEFAULT_NAV_PREFERENCES,
  normalizeNavPreferences,
  type NavPreferences
} from '../../shared/navigation/navPreferences.ts'

function preferencesPath(): string {
  return join(app.getPath('userData'), 'nav-preferences.json')
}

export function readNavPreferences(): NavPreferences {
  const path = preferencesPath()
  if (!existsSync(path)) {
    return normalizeNavPreferences(DEFAULT_NAV_PREFERENCES)
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    return normalizeNavPreferences(raw)
  } catch {
    return normalizeNavPreferences(DEFAULT_NAV_PREFERENCES)
  }
}

export function writeNavPreferences(prefs: NavPreferences): NavPreferences {
  const normalized = normalizeNavPreferences(prefs)
  const path = preferencesPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}

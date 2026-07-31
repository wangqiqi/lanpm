import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import {
  normalizeNavPreferences,
  normalizeNavPreferencesDocument,
  type NavPreferences,
  type NavPreferencesDocument
} from '../../shared/navigation/navPreferences.ts'

function preferencesPath(): string {
  return join(app.getPath('userData'), 'nav-preferences.json')
}

function readRawDocument(): unknown {
  const path = preferencesPath()
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown
  } catch {
    return null
  }
}

export function readNavPreferencesDocument(): NavPreferencesDocument {
  return normalizeNavPreferencesDocument(readRawDocument())
}

function writeNavPreferencesDocument(doc: NavPreferencesDocument): NavPreferencesDocument {
  const normalized = normalizeNavPreferencesDocument(doc)
  const path = preferencesPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}

/** 全局偏好（向后兼容 IPC） */
export function readNavPreferences(): NavPreferences {
  return readNavPreferencesDocument().global
}

export function writeNavPreferences(prefs: NavPreferences): NavPreferences {
  const doc = readNavPreferencesDocument()
  doc.global = normalizeNavPreferences(prefs)
  return writeNavPreferencesDocument(doc).global
}

export function readGroupNavPreferences(groupId: string): NavPreferences | null {
  const trimmed = groupId.trim()
  if (!trimmed) return null
  const doc = readNavPreferencesDocument()
  return doc.byGroup[trimmed] ?? null
}

export function writeGroupNavPreferences(groupId: string, prefs: NavPreferences): NavPreferences {
  const trimmed = groupId.trim()
  if (!trimmed) {
    throw new Error('invalid group id')
  }
  const doc = readNavPreferencesDocument()
  doc.byGroup[trimmed] = normalizeNavPreferences(prefs)
  return writeNavPreferencesDocument(doc).byGroup[trimmed]!
}

export function clearGroupNavOverride(groupId: string): NavPreferencesDocument {
  const trimmed = groupId.trim()
  if (!trimmed) {
    throw new Error('invalid group id')
  }
  const doc = readNavPreferencesDocument()
  delete doc.byGroup[trimmed]
  return writeNavPreferencesDocument(doc)
}

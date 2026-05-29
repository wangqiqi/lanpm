import type { Database } from 'better-sqlite3'
import {
  clampLocalRetentionDays,
  LEGACY_MESSAGE_TTL_META_KEY,
  LOCAL_RETENTION_DAYS_DEFAULT,
  LOCAL_RETENTION_META_KEY
} from '../../shared/data/retention'
import { deleteMeta, getMeta, setMeta } from '../storage/repositories/syncMetaRepository'

export function getLocalRetentionDays(db: Database): number {
  const raw = getMeta(db, LOCAL_RETENTION_META_KEY) ?? getMeta(db, LEGACY_MESSAGE_TTL_META_KEY)
  const n = raw ? Number(raw) : LOCAL_RETENTION_DAYS_DEFAULT
  return clampLocalRetentionDays(n)
}

export function setLocalRetentionDays(db: Database, days: number): number {
  const clamped = clampLocalRetentionDays(days)
  setMeta(db, LOCAL_RETENTION_META_KEY, String(clamped))
  if (getMeta(db, LEGACY_MESSAGE_TTL_META_KEY)) {
    deleteMeta(db, LEGACY_MESSAGE_TTL_META_KEY)
  }
  return clamped
}

export function ensureLocalRetentionMeta(db: Database): void {
  if (!getMeta(db, LOCAL_RETENTION_META_KEY)) {
    setLocalRetentionDays(db, LOCAL_RETENTION_DAYS_DEFAULT)
  }
}

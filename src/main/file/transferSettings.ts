import type { Database } from 'better-sqlite3'
import {
  clampFileTransferRateKbps,
  FILE_TRANSFER_RATE_KEY
} from '../../shared/file/settings.ts'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'

export { FILE_TRANSFER_RATE_KEY }

export interface FileTransferSettings {
  /** 0 = 不限速 */
  rateKbps: number
}

export function getFileTransferSettings(db: Database): FileTransferSettings {
  const raw = getMeta(db, FILE_TRANSFER_RATE_KEY)
  const n = raw ? Number(raw) : 0
  return { rateKbps: clampFileTransferRateKbps(n) }
}

export function setFileTransferRateKbps(db: Database, rateKbps: number): FileTransferSettings {
  const safe = clampFileTransferRateKbps(rateKbps)
  setMeta(db, FILE_TRANSFER_RATE_KEY, String(safe))
  return { rateKbps: safe }
}

/** 单分片传输后应等待的毫秒数（PRD-F-11） */
export function chunkDelayMs(chunkBytes: number, rateKbps: number, baseMs = 20): number {
  if (rateKbps <= 0) return baseMs
  const bytesPerSec = (rateKbps * 1024) / 8
  if (bytesPerSec <= 0) return baseMs
  return Math.max(baseMs, Math.ceil((chunkBytes / bytesPerSec) * 1000))
}

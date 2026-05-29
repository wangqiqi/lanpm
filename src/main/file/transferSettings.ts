import type { Database } from 'better-sqlite3'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'

export const FILE_TRANSFER_RATE_KEY = 'file_transfer_rate_kbps'

export interface FileTransferSettings {
  /** 0 = 不限速 */
  rateKbps: number
}

export function getFileTransferSettings(db: Database): FileTransferSettings {
  const raw = getMeta(db, FILE_TRANSFER_RATE_KEY)
  const n = raw ? Number(raw) : 0
  return { rateKbps: Number.isFinite(n) && n >= 0 ? n : 0 }
}

export function setFileTransferRateKbps(db: Database, rateKbps: number): FileTransferSettings {
  const safe = Number.isFinite(rateKbps) && rateKbps >= 0 ? Math.floor(rateKbps) : 0
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

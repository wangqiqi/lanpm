import type { FileTransferStatus } from './types'

/** 进行中可取消 */
export function canCancelTransfer(status: FileTransferStatus): boolean {
  return status === 'queued' || status === 'transferring'
}

/** 失败 / 取消 / 暂停（及带进度的卡住下载）可重试续传 */
export function canRetryTransfer(
  status: FileTransferStatus,
  direction: 'upload' | 'download',
  transferredBytes: number
): boolean {
  if (status === 'failed' || status === 'paused' || status === 'cancelled') return true
  return direction === 'download' && status === 'transferring' && transferredBytes > 0
}

/**
 * 用相邻采样估算平均速率（字节/秒）。
 * samples 按时间升序，至少 2 点且间隔 ≥ 200ms。
 */
export function estimateBytesPerSecond(
  samples: ReadonlyArray<{ t: number; bytes: number }>
): number | null {
  if (samples.length < 2) return null
  const first = samples[0]
  const last = samples[samples.length - 1]
  if (!first || !last) return null
  const dtMs = last.t - first.t
  if (dtMs < 200) return null
  const dBytes = last.bytes - first.bytes
  if (dBytes < 0) return null
  return (dBytes * 1000) / dtMs
}

/** 剩余秒数；速率过低时返回 null */
export function estimateEtaSeconds(remainingBytes: number, bytesPerSec: number): number | null {
  if (remainingBytes <= 0) return 0
  if (!(bytesPerSec > 0) || !Number.isFinite(bytesPerSec)) return null
  return remainingBytes / bytesPerSec
}

export function formatEtaSeconds(seconds: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds)) return null
  if (seconds <= 0) return '0s'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60)
    const s = Math.ceil(seconds % 60)
    return `${m}m ${s}s`
  }
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function formatRate(bytesPerSec: number | null): string | null {
  if (bytesPerSec == null || !(bytesPerSec > 0) || !Number.isFinite(bytesPerSec)) return null
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

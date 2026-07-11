/** PRD-F-11 — 文件传输限速配置（KB/s，0 = 不限速） */
export const FILE_TRANSFER_RATE_KEY = 'file_transfer_rate_kbps'

/** 上限 KB/s，防止异常大值导致等待计算溢出或 UI 失控 */
export const FILE_TRANSFER_RATE_MAX_KBPS = 100_000

export interface FileTransferSettingsView {
  rateKbps: number
}

/** 非法/负数 → 0（不限速）；超过上限 → MAX */
export function clampFileTransferRateKbps(rateKbps: number | null | undefined): number {
  if (typeof rateKbps !== 'number' || !Number.isFinite(rateKbps) || rateKbps < 0) return 0
  return Math.min(FILE_TRANSFER_RATE_MAX_KBPS, Math.floor(rateKbps))
}

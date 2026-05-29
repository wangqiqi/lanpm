/** PRD-F-11 — 文件传输限速配置（KB/s，0 = 不限速） */
export const FILE_TRANSFER_RATE_KEY = 'file_transfer_rate_kbps'

export interface FileTransferSettingsView {
  rateKbps: number
}

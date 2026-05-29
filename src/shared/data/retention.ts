/** 本机消息保留（天）— docs/03 §12 数据生命周期 */
export const LOCAL_RETENTION_DAYS_DEFAULT = 90
export const LOCAL_RETENTION_DAYS_MIN = 7
export const LOCAL_RETENTION_DAYS_MAX = 365

/** P2P 入站补拉窗口（天）— 固定，不可配置 */
export const SYNC_WINDOW_DAYS = 7

export const LOCAL_RETENTION_META_KEY = 'sync_meta.local_retention_days'

/** @deprecated 使用 LOCAL_RETENTION_META_KEY；读取时迁移 */
export const LEGACY_MESSAGE_TTL_META_KEY = 'sync_meta.message_ttl_days'

export function clampLocalRetentionDays(days: number): number {
  if (!Number.isFinite(days)) return LOCAL_RETENTION_DAYS_DEFAULT
  return Math.min(LOCAL_RETENTION_DAYS_MAX, Math.max(LOCAL_RETENTION_DAYS_MIN, Math.floor(days)))
}

export function retentionCutoffIso(days: number, now = Date.now()): string {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString()
}

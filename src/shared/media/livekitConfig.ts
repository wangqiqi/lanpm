/** LiveKit 旁路配置（Pro 会议）— Secret 仅 Main 持久化 */
export type LiveKitConfig = {
  /** WebSocket URL，如 ws://192.168.1.10:7880 */
  url: string
  apiKey: string
  apiSecret: string
}

/** Renderer / IPC 可见（不含 Secret） */
export type LiveKitConfigPublic = {
  url: string
  apiKey: string
  configured: boolean
}

export const EMPTY_LIVEKIT_CONFIG: LiveKitConfig = {
  url: '',
  apiKey: '',
  apiSecret: ''
}

export function normalizeLiveKitUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^http/i, 'ws').replace(/\/$/, '')
  }
  if (/^wss?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '')
  }
  return `ws://${trimmed.replace(/\/$/, '')}`
}

export function normalizeLiveKitConfig(input: unknown): LiveKitConfig {
  if (!input || typeof input !== 'object') return { ...EMPTY_LIVEKIT_CONFIG }
  const o = input as Record<string, unknown>
  return {
    url: normalizeLiveKitUrl(String(o.url ?? '')),
    apiKey: String(o.apiKey ?? '').trim(),
    apiSecret: String(o.apiSecret ?? '').trim()
  }
}

export function isLiveKitConfigComplete(config: LiveKitConfig): boolean {
  return (
    config.url.length > 0 &&
    config.apiKey.length >= 3 &&
    config.apiSecret.length >= 16
  )
}

export function toLiveKitConfigPublic(config: LiveKitConfig): LiveKitConfigPublic {
  return {
    url: config.url,
    apiKey: config.apiKey,
    configured: isLiveKitConfigComplete(config)
  }
}

export function liveKitRoomNameForGroup(groupId: string): string {
  const safe = groupId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48)
  return `lanpm-${safe}`
}

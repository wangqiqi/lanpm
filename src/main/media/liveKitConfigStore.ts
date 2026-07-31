import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import {
  EMPTY_LIVEKIT_CONFIG,
  normalizeLiveKitConfig,
  type LiveKitConfig
} from '../../shared/media/livekitConfig.ts'

function configPath(): string {
  return join(app.getPath('userData'), 'meeting-livekit.json')
}

export function readLiveKitConfig(): LiveKitConfig {
  const path = configPath()
  if (!existsSync(path)) {
    return { ...EMPTY_LIVEKIT_CONFIG }
  }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    return normalizeLiveKitConfig(raw)
  } catch {
    return { ...EMPTY_LIVEKIT_CONFIG }
  }
}

export function writeLiveKitConfig(input: unknown): LiveKitConfig {
  const current = readLiveKitConfig()
  const normalized = normalizeLiveKitConfig(input)
  if (!normalized.apiSecret && current.apiSecret) {
    normalized.apiSecret = current.apiSecret
  }
  const path = configPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(normalized, null, 2), 'utf8')
  return normalized
}

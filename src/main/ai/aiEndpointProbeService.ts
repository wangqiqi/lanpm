import type { Database } from 'better-sqlite3'
import type { AiGateStatus } from '../../shared/ai/types.ts'
import type { AiEndpointProbeResult, AiProbeEndpointInput } from '../../shared/ai/endpointProbe.ts'
import {
  AI_ENDPOINT_PROBE_STARTUP_DELAY_MS,
  AI_ENDPOINT_PROBE_TIMEOUT_MS,
  buildModelsProbeUrl,
  classifyProbeHttpStatus,
  isProbeCacheFresh
} from '../../shared/ai/endpointProbe.ts'
import { getAiConfig, getDecryptedApiKey } from './aiConfigService.ts'

let probeCache: AiEndpointProbeResult | null = null
let probeCacheKey: string | null = null
let startupTimer: ReturnType<typeof setTimeout> | null = null
let dbRef: Database | null = null

function cacheKeyFor(baseUrl: string): string {
  return baseUrl.trim().replace(/\/$/, '')
}

function readCached(baseUrl: string): AiEndpointProbeResult | null {
  const key = cacheKeyFor(baseUrl)
  if (!probeCache || probeCacheKey !== key) return null
  if (!isProbeCacheFresh(probeCache)) return null
  return { ...probeCache, fromCache: true }
}

function writeCache(baseUrl: string, result: AiEndpointProbeResult): AiEndpointProbeResult {
  probeCacheKey = cacheKeyFor(baseUrl)
  probeCache = { ...result, fromCache: false }
  return probeCache
}

async function fetchProbe(
  baseUrl: string,
  apiKey: string
): Promise<AiEndpointProbeResult> {
  const checkedAt = new Date().toISOString()
  const url = buildModelsProbeUrl(baseUrl)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_ENDPOINT_PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: controller.signal
    })
    clearTimeout(timer)
    const { reachable, errorCode } = classifyProbeHttpStatus(res.status)
    return { reachable, checkedAt, statusCode: res.status, errorCode: reachable ? undefined : errorCode }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err instanceof Error && err.name === 'AbortError'
    return {
      reachable: false,
      checkedAt,
      errorCode: isTimeout ? 'timeout' : 'network'
    }
  }
}

export function getAiGateStatus(db: Database): AiGateStatus {
  const config = getAiConfig(db)
  const hasApiKey = Boolean(config?.hasApiKey)
  const enabled = Boolean(config?.enabled)
  let endpointReachable: boolean | null = null
  let endpointCheckedAt: string | null = null

  if (hasApiKey && config?.baseUrl) {
    const cached = readCached(config.baseUrl)
    if (cached) {
      endpointReachable = cached.reachable
      endpointCheckedAt = cached.checkedAt
    }
  }

  const canStream = enabled && hasApiKey && endpointReachable === true
  return { enabled, hasApiKey, endpointReachable, endpointCheckedAt, canStream }
}

/** Whether external AI calls are allowed (config + successful probe). */
export function isExternalAiAvailable(db: Database): boolean {
  return getAiGateStatus(db).canStream
}

export async function probeAiEndpoint(
  db: Database,
  input?: AiProbeEndpointInput & { force?: boolean }
): Promise<AiEndpointProbeResult> {
  const config = getAiConfig(db)
  const baseUrl = (input?.baseUrl ?? config?.baseUrl ?? '').trim()
  if (!baseUrl) {
    return { reachable: false, checkedAt: new Date().toISOString(), errorCode: 'no_config' }
  }

  const apiKey = input?.apiKey?.trim() || getDecryptedApiKey(db)
  if (!apiKey) {
    return { reachable: false, checkedAt: new Date().toISOString(), errorCode: 'no_config' }
  }

  if (!input?.force) {
    const cached = readCached(baseUrl)
    if (cached) return cached
  }

  const result = await fetchProbe(baseUrl, apiKey)
  return writeCache(baseUrl, result)
}

export function initAiEndpointProbeScheduler(db: Database): void {
  dbRef = db
  if (startupTimer) {
    clearTimeout(startupTimer)
    startupTimer = null
  }
  startupTimer = setTimeout(() => {
    void probeAiEndpoint(dbRef!).catch((err) => {
      console.warn('[ai-endpoint-probe] startup probe failed:', err)
    })
    startupTimer = null
  }, AI_ENDPOINT_PROBE_STARTUP_DELAY_MS)
}

export function shutdownAiEndpointProbeScheduler(): void {
  if (startupTimer) {
    clearTimeout(startupTimer)
    startupTimer = null
  }
  dbRef = null
}

/** For tests — reset in-memory cache. */
export function resetAiEndpointProbeCacheForTests(): void {
  probeCache = null
  probeCacheKey = null
}

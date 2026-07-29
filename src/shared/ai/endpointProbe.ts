/** Successful probe cache TTL (5 min). */
export const AI_ENDPOINT_PROBE_SUCCESS_TTL_MS = 5 * 60 * 1000

/** Failed probe cache TTL (2 min) — avoid retry storms. */
export const AI_ENDPOINT_PROBE_FAILURE_TTL_MS = 2 * 60 * 1000

/** HTTP probe timeout. */
export const AI_ENDPOINT_PROBE_TIMEOUT_MS = 5000

/** Delay before first probe after app start. */
export const AI_ENDPOINT_PROBE_STARTUP_DELAY_MS = 30 * 1000

export type AiEndpointProbeErrorCode = 'network' | 'timeout' | 'http_5xx' | 'no_config'

export interface AiEndpointProbeResult {
  reachable: boolean
  checkedAt: string
  statusCode?: number
  errorCode?: AiEndpointProbeErrorCode
  /** True when returned from in-memory TTL cache without a new HTTP call. */
  fromCache?: boolean
}

export interface AiProbeEndpointInput {
  baseUrl?: string
  /** Omit to use stored key (probe after save). */
  apiKey?: string
}

/** 404 and other <500 responses mean the host is reachable. */
export function classifyProbeHttpStatus(status: number): { reachable: boolean; errorCode?: AiEndpointProbeErrorCode } {
  if (status >= 500) {
    return { reachable: false, errorCode: 'http_5xx' }
  }
  return { reachable: true }
}

export function isProbeCacheFresh(result: AiEndpointProbeResult, now = Date.now()): boolean {
  const checked = Date.parse(result.checkedAt)
  if (Number.isNaN(checked)) return false
  const age = now - checked
  const ttl = result.reachable
    ? AI_ENDPOINT_PROBE_SUCCESS_TTL_MS
    : AI_ENDPOINT_PROBE_FAILURE_TTL_MS
  return age >= 0 && age < ttl
}

export function buildModelsProbeUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/models`
}

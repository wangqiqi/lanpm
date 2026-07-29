import { describe, expect, it } from 'vitest'
import {
  AI_ENDPOINT_PROBE_FAILURE_TTL_MS,
  AI_ENDPOINT_PROBE_SUCCESS_TTL_MS,
  classifyProbeHttpStatus,
  isProbeCacheFresh
} from '../../../src/shared/ai/endpointProbe.ts'

describe('endpointProbe', () => {
  it('treats 404 as reachable', () => {
    expect(classifyProbeHttpStatus(404).reachable).toBe(true)
  })

  it('treats 5xx as unreachable', () => {
    const r = classifyProbeHttpStatus(503)
    expect(r.reachable).toBe(false)
    expect(r.errorCode).toBe('http_5xx')
  })

  it('respects success TTL', () => {
    const now = Date.now()
    const result = {
      reachable: true,
      checkedAt: new Date(now - AI_ENDPOINT_PROBE_SUCCESS_TTL_MS + 1000).toISOString()
    }
    expect(isProbeCacheFresh(result, now)).toBe(true)
    expect(
      isProbeCacheFresh(
        { ...result, checkedAt: new Date(now - AI_ENDPOINT_PROBE_SUCCESS_TTL_MS - 1).toISOString() },
        now
      )
    ).toBe(false)
  })

  it('uses shorter TTL for failures', () => {
    const now = Date.now()
    const result = {
      reachable: false,
      checkedAt: new Date(now - AI_ENDPOINT_PROBE_FAILURE_TTL_MS + 1000).toISOString()
    }
    expect(isProbeCacheFresh(result, now)).toBe(true)
  })
})

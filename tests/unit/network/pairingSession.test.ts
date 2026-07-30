import { describe, expect, it } from 'vitest'
import { PairingSessionHost } from '../../../src/main/network/real/pairingSession'
import {
  formatPairingCode,
  isPairingLookupRateLimited,
  normalizePairingCode,
  PAIRING_LOOKUP_RATE_WINDOW_MS,
  PAIRING_TTL_MS
} from '../../../src/shared/network/pairingTypes'

const identity = {
  deviceId: 'dev_test',
  userId: 'user_test',
  displayName: 'Test Host',
  listenPort: 43_124,
  getGroups: () => [{ groupId: 'grp_1', name: '项目 A', type: 'project' as const }],
  getHost: () => '192.168.1.10'
}

describe('pairingSession', () => {
  it('starts session with 6-digit code and discoverable groups', () => {
    const host = new PairingSessionHost(identity)
    const view = host.start()
    expect(view.code).toMatch(/^\d{6}$/)
    expect(view.codeDisplay).toBe(formatPairingCode(view.code))
    expect(view.groups).toHaveLength(1)
    expect(host.isActive()).toBe(true)
  })

  it('responds to matching lookup once then consumes session', () => {
    const host = new PairingSessionHost(identity)
    const view = host.start()
    const found = host.handleLookup({
      code: view.code,
      joinerDeviceId: 'dev_joiner',
      joinerDisplayName: 'Joiner'
    })
    expect(found).not.toBeNull()
    expect(found?.userId).toBe('user_test')
    expect(found?.groups).toHaveLength(1)

    const again = host.handleLookup({
      code: view.code,
      joinerDeviceId: 'dev_joiner2',
      joinerDisplayName: 'Joiner 2'
    })
    expect(again).toBeNull()
  })

  it('rate-limits lookups per joiner per minute', () => {
    const host = new PairingSessionHost(identity)
    host.start()
    for (let i = 0; i < 4; i++) {
      expect(
        host.handleResolve({
          code: '000000',
          joinerDeviceId: 'dev_spam',
          joinerDisplayName: 'Spam'
        })
      ).toEqual({ status: 'fail', reason: 'mismatch' })
    }
    expect(
      host.handleResolve({
        code: '000000',
        joinerDeviceId: 'dev_spam',
        joinerDisplayName: 'Spam'
      })
    ).toEqual({ status: 'fail', reason: 'rate_limit' })
  })

  it('rejects wrong code and locks after repeated failures', () => {
    const host = new PairingSessionHost(identity)
    const view = host.start()
    for (let i = 0; i < 5; i++) {
      expect(
        host.handleLookup({
          code: '000000',
          joinerDeviceId: 'dev_bad',
          joinerDisplayName: 'Bad'
        })
      ).toBeNull()
    }
    expect(
      host.handleLookup({
        code: view.code,
        joinerDeviceId: 'dev_bad',
        joinerDisplayName: 'Bad'
      })
    ).toBeNull()
    expect(host.isActive()).toBe(false)
  })

  it('expires session after TTL', () => {
    const host = new PairingSessionHost(identity)
    const view = host.start()
    const realNow = Date.now
    Date.now = () => realNow() + PAIRING_TTL_MS + 1
    try {
      expect(host.isActive()).toBe(false)
      expect(
        host.handleLookup({
          code: view.code,
          joinerDeviceId: 'dev_joiner',
          joinerDisplayName: 'Joiner'
        })
      ).toBeNull()
    } finally {
      Date.now = realNow
    }
  })
})

describe('pairingTypes', () => {
  it('normalizes pairing code input', () => {
    expect(normalizePairingCode('847 293')).toBe('847293')
    expect(normalizePairingCode('84')).toBe('000084')
  })

  it('detects per-minute lookup rate limit', () => {
    const now = 1_000_000
    const stamps = Array.from({ length: 12 }, (_, i) => now - i * 1000)
    expect(isPairingLookupRateLimited(stamps, now)).toBe(true)
    expect(isPairingLookupRateLimited(stamps, now + PAIRING_LOOKUP_RATE_WINDOW_MS + 1)).toBe(
      false
    )
  })
})

describe('pairingResolve', () => {
  it('handleResolve returns fail reasons', () => {
    const host = new PairingSessionHost(identity)
    const view = host.start()
    expect(host.handleResolve({
      code: '000000',
      joinerDeviceId: 'bad',
      joinerDisplayName: 'Bad'
    })).toEqual({ status: 'fail', reason: 'mismatch' })
    expect(host.handleResolve({
      code: view.code,
      joinerDeviceId: 'good',
      joinerDisplayName: 'Good'
    }).status).toBe('ok')
  })
})

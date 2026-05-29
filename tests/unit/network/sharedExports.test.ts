import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TCP_LISTEN_PORT,
  DISCOVERY_INTERVAL_MS,
  HEARTBEAT_INTERVAL_MS,
  NETWORK_IPC,
  PEER_TTL_MS,
  RECONNECT_BACKOFF_MS,
  UDP_DISCOVERY_PORT
} from '@shared/network'
import { UDP_MULTICAST_ADDR } from '@shared/network/constants'

describe('network shared exports', () => {
  it('exposes documented ports and intervals', () => {
    expect(UDP_DISCOVERY_PORT).toBe(43123)
    expect(UDP_MULTICAST_ADDR).toBe('239.255.43.123')
    expect(DEFAULT_TCP_LISTEN_PORT).toBe(43124)
    expect(DISCOVERY_INTERVAL_MS).toBe(3000)
    expect(HEARTBEAT_INTERVAL_MS).toBe(5000)
    expect(PEER_TTL_MS).toBe(15000)
    expect(RECONNECT_BACKOFF_MS).toEqual([1000, 2000, 4000, 8000, 20000])
  })

  it('defines IPC channel names', () => {
    expect(NETWORK_IPC.getStatus).toBe('network:getStatus')
    expect(NETWORK_IPC.reconnect).toBe('network:reconnect')
    expect(NETWORK_IPC.connectManualPeer).toBe('network:connectManualPeer')
  })
})

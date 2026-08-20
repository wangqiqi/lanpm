import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { PEER_PUBKEY_MISMATCH, pinPeerPublicKey } from '../../../src/main/crypto/peerTrustStore.ts'
import { RealNetworkTransport } from '../../../src/main/network/real/RealNetworkTransport.ts'

function reservePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        server.close()
        reject(new Error('failed to reserve port'))
        return
      }
      const port = addr.port
      server.close((err) => (err ? reject(err) : resolve(port)))
    })
  })
}

describe('handshake pin / TOFU', () => {
  const dirs: string[] = []
  const prev = process.env.LANPM_USER_DATA

  afterEach(() => {
    if (prev === undefined) delete process.env.LANPM_USER_DATA
    else process.env.LANPM_USER_DATA = prev
    for (const dir of dirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  function isolate(): string {
    const dir = mkdtempSync(join(tmpdir(), 'lanpm-hs-'))
    dirs.push(dir)
    process.env.LANPM_USER_DATA = dir
    return dir
  }

  it('TOFU first connect then pin mismatch refuses ready', async () => {
    const portB = await reservePort()
    const portC = await reservePort()
    const portA = await reservePort()

    isolate()
    const b = new RealNetworkTransport({
      deviceId: 'dev_pin_b',
      userId: 'user_b',
      displayName: 'B',
      listenPort: portB,
      disableUdp: true
    })
    b.start()
    const genuinePub = b.getLocalPublicKeyHex()

    isolate()
    const c = new RealNetworkTransport({
      deviceId: 'dev_pin_b',
      userId: 'user_b',
      displayName: 'B-imposter',
      listenPort: portC,
      disableUdp: true
    })
    c.start()
    expect(c.getLocalPublicKeyHex()).not.toBe(genuinePub)

    isolate()
    pinPeerPublicKey('dev_pin_b', genuinePub, 'tofu')

    const a = new RealNetworkTransport({
      deviceId: 'dev_pin_a',
      userId: 'user_a',
      displayName: 'A',
      listenPort: portA,
      disableUdp: true
    })
    a.start()

    try {
      await expect(a.connectManualHost('127.0.0.1', portC)).rejects.toThrow(PEER_PUBKEY_MISMATCH)
    } finally {
      a.stop()
      b.stop()
      c.stop()
    }
  }, 15_000)

  it('TOFU accepts unknown peer then reconnects with the same key', async () => {
    isolate()
    const portA = await reservePort()
    const portB = await reservePort()
    const a = new RealNetworkTransport({
      deviceId: 'dev_tofu_a',
      userId: 'user_a',
      displayName: 'A',
      listenPort: portA,
      disableUdp: true
    })
    const b = new RealNetworkTransport({
      deviceId: 'dev_tofu_b',
      userId: 'user_b',
      displayName: 'B',
      listenPort: portB,
      disableUdp: true
    })
    a.start()
    b.start()
    try {
      await a.connectManualHost('127.0.0.1', portB)
      await a.connectManualHost('127.0.0.1', portB)
    } finally {
      a.stop()
      b.stop()
    }
  }, 15_000)
})

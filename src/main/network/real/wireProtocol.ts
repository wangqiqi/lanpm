import type { SyncEnvelope } from '../../shared/network/types'

export type WireMessage =
  | { kind: 'handshake'; deviceId: string; userId: string; displayName: string; publicKey: string }
  | { kind: 'handshake_ack'; publicKey: string }
  | { kind: 'envelope'; envelope: SyncEnvelope }
  | { kind: 'ping' }

export function encodeWire(msg: WireMessage): Buffer {
  const json = JSON.stringify(msg)
  const body = Buffer.from(json, 'utf8')
  const header = Buffer.alloc(4)
  header.writeUInt32BE(body.length, 0)
  return Buffer.concat([header, body])
}

export function createWireDecoder(onMessage: (msg: WireMessage) => void): {
  feed: (chunk: Buffer) => void
} {
  let buffer = Buffer.alloc(0)

  const feed = (chunk: Buffer): void => {
    buffer = Buffer.concat([buffer, chunk])
    while (buffer.length >= 4) {
      const len = buffer.readUInt32BE(0)
      if (buffer.length < 4 + len) return
      const body = buffer.subarray(4, 4 + len)
      buffer = buffer.subarray(4 + len)
      try {
        onMessage(JSON.parse(body.toString('utf8')) as WireMessage)
      } catch {
        // skip malformed
      }
    }
  }

  return { feed }
}

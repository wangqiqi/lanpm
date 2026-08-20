import type { DiscoverableGroupAdvert } from '../../../shared/discover/types'
import type { DiscoverRelayPacket } from '../../../shared/discover/discoverRelay.ts'
import type { SyncEnvelope } from '../../../shared/network/types'
import type { PairingResolveFailReason } from '../../../shared/network/pairingTypes.ts'

/** TCP 握手 / 周期广播：跨子网手动节点也能填充「发现」列表 */
export interface WirePeerProfile {
  deviceId: string
  userId: string
  displayName: string
  listenPort: number
  groups?: DiscoverableGroupAdvert[]
  /** TASK-4203: peer accepts envelope_bin (raw ciphertext after JSON header) */
  envBin?: boolean
}

/** JSON envelope header without payload; ciphertext follows on the wire. */
export type WireEnvelopeMeta = Omit<SyncEnvelope, 'payload'>

/** Scheme B: 4B frame + 4B headerLen + JSON header + raw AES-GCM ciphertext. */
export interface WireEnvelopeBin {
  kind: 'envelope_bin'
  envelope: WireEnvelopeMeta
  ciphertext: Buffer
}

export type WireMessage =
  | ({ kind: 'handshake'; publicKey: string } & WirePeerProfile)
  | ({ kind: 'handshake_ack'; publicKey: string } & WirePeerProfile)
  | ({ kind: 'peer_advert' } & WirePeerProfile)
  | DiscoverRelayPacket
  | {
      kind: 'pairing_resolve'
      code: string
      joinerDeviceId: string
      joinerDisplayName: string
    }
  | ({ kind: 'pairing_resolve_ok' } & WirePeerProfile)
  | { kind: 'pairing_resolve_fail'; reason: PairingResolveFailReason }
  | { kind: 'envelope'; envelope: SyncEnvelope }
  | WireEnvelopeBin
  | { kind: 'ping' }

const JSON_OBJECT_START = 0x7b

function frameLengthPrefixed(body: Buffer): Buffer {
  const header = Buffer.alloc(4)
  header.writeUInt32BE(body.length, 0)
  return Buffer.concat([header, body])
}

function encodeEnvelopeBinBody(msg: WireEnvelopeBin): Buffer {
  const json = Buffer.from(
    JSON.stringify({ kind: 'envelope_bin', envelope: msg.envelope }),
    'utf8'
  )
  const jsonLen = Buffer.alloc(4)
  jsonLen.writeUInt32BE(json.length, 0)
  return Buffer.concat([jsonLen, json, msg.ciphertext])
}

function decodeEnvelopeBinBody(body: Buffer): WireEnvelopeBin | null {
  if (body.length < 4) return null
  const jsonLen = body.readUInt32BE(0)
  if (jsonLen < 2 || body.length < 4 + jsonLen) return null
  try {
    const header = JSON.parse(body.subarray(4, 4 + jsonLen).toString('utf8')) as {
      kind?: string
      envelope?: WireEnvelopeMeta
    }
    if (header.kind !== 'envelope_bin' || !header.envelope) return null
    return {
      kind: 'envelope_bin',
      envelope: header.envelope,
      ciphertext: Buffer.from(body.subarray(4 + jsonLen))
    }
  } catch {
    return null
  }
}

export function peerAcceptsEnvelopeBin(profile: { envBin?: boolean }): boolean {
  return profile.envBin === true
}

export function shouldSendEnvelopeBin(
  peerEnvBin: boolean,
  type: SyncEnvelope['type']
): boolean {
  return peerEnvBin && type === 'file_chunk'
}

export function encodeWire(msg: WireMessage): Buffer {
  if (msg.kind === 'envelope_bin') {
    return frameLengthPrefixed(encodeEnvelopeBinBody(msg))
  }
  const json = JSON.stringify(msg)
  return frameLengthPrefixed(Buffer.from(json, 'utf8'))
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
        if (body.length > 0 && body[0] === JSON_OBJECT_START) {
          onMessage(JSON.parse(body.toString('utf8')) as WireMessage)
        } else {
          const bin = decodeEnvelopeBinBody(body)
          if (bin) onMessage(bin)
        }
      } catch {
        // skip malformed
      }
    }
  }

  return { feed }
}

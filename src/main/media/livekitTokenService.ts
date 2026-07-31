import { createHmac } from 'crypto'
import {
  isLiveKitConfigComplete,
  liveKitRoomNameForGroup,
  type LiveKitConfig
} from '../../shared/media/livekitConfig.ts'
import { readLiveKitConfig } from './liveKitConfigStore.ts'

function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data
  return buf.toString('base64url')
}

/** LiveKit AccessToken（HS256）— 与 server-sdk 子集兼容 */
export function createLiveKitAccessToken(
  config: LiveKitConfig,
  args: { identity: string; roomName: string; ttlSeconds?: number }
): string {
  if (!isLiveKitConfigComplete(config)) {
    throw new Error('LiveKit not configured')
  }
  const now = Math.floor(Date.now() / 1000)
  const ttl = args.ttlSeconds ?? 3600
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    exp: now + ttl,
    iss: config.apiKey,
    nbf: now - 10,
    sub: args.identity,
    video: {
      room: args.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    },
    audio: {
      room: args.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true
    }
  }
  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`
  const signature = createHmac('sha256', config.apiSecret)
    .update(signingInput)
    .digest('base64url')
  return `${signingInput}.${signature}`
}

export function createLiveKitTokenForGroup(args: {
  groupId: string
  identity: string
  roomName?: string
}): { token: string; url: string; roomName: string } {
  const config = readLiveKitConfig()
  const roomName = args.roomName?.trim() || liveKitRoomNameForGroup(args.groupId)
  const identity = args.identity.trim()
  if (!identity) throw new Error('identity required')
  const token = createLiveKitAccessToken(config, { identity, roomName })
  return { token, url: config.url, roomName }
}

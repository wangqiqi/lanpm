import { timingSafeEqual } from 'node:crypto'

export function gatewayTokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function readBearerToken(headers: { authorization?: string | string[] }): string | null {
  const raw = headers.authorization
  const header = Array.isArray(raw) ? raw[0] : raw
  if (!header || !header.startsWith('Bearer ')) return null
  const token = header.slice('Bearer '.length)
  return token.length > 0 ? token : null
}

export function readWsSubprotocolToken(headers: {
  'sec-websocket-protocol'?: string | string[]
}): string | null {
  const raw = headers['sec-websocket-protocol']
  const header = Array.isArray(raw) ? raw[0] : raw
  if (!header) return null
  const first = header.split(',')[0]?.trim()
  return first && first.length > 0 ? first : null
}

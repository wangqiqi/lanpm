import { timingSafeEqual } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { resolveP2pAuthDir } from './p2pAuthPaths.ts'

export const PEER_PUBKEY_MISMATCH = 'peer_pubkey_mismatch'

export type PeerPinSource = 'tofu' | 'pairing' | 'peer_file'

export interface PeerPinRecord {
  publicKeyHex: string
  source: PeerPinSource
  pinnedAt: string
}

interface TrustFile {
  version: 1
  peers: Record<string, PeerPinRecord>
}

function storePath(): string {
  return join(resolveP2pAuthDir(), 'peer-trust.json')
}

function readFile(): TrustFile {
  const path = storePath()
  if (!existsSync(path)) return { version: 1, peers: {} }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as TrustFile
    if (raw?.version !== 1 || !raw.peers || typeof raw.peers !== 'object') {
      return { version: 1, peers: {} }
    }
    return raw
  } catch {
    return { version: 1, peers: {} }
  }
}

function writeFile(data: TrustFile): void {
  const path = storePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export function normalizePublicKeyHex(hex: string): string {
  return hex.trim().toLowerCase()
}

function hexEqual(a: string, b: string): boolean {
  const left = Buffer.from(normalizePublicKeyHex(a), 'hex')
  const right = Buffer.from(normalizePublicKeyHex(b), 'hex')
  if (left.length === 0 || right.length === 0 || left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function getPinnedPeerPublicKey(deviceId: string): PeerPinRecord | null {
  return readFile().peers[deviceId] ?? null
}

export function pinPeerPublicKey(
  deviceId: string,
  publicKeyHex: string,
  source: PeerPinSource
): void {
  const file = readFile()
  const next = normalizePublicKeyHex(publicKeyHex)
  const existing = file.peers[deviceId]
  if (existing && !hexEqual(existing.publicKeyHex, next)) {
    throw new Error(PEER_PUBKEY_MISMATCH)
  }
  file.peers[deviceId] = {
    publicKeyHex: next,
    source: existing?.source === 'pairing' && source === 'tofu' ? 'pairing' : source,
    pinnedAt: existing?.pinnedAt ?? new Date().toISOString()
  }
  writeFile(file)
}

/** 无钉则 TOFU 写入；已钉则必须匹配。 */
export function acceptOrPinPeerPublicKey(
  deviceId: string,
  publicKeyHex: string,
  source: PeerPinSource
): void {
  pinPeerPublicKey(deviceId, publicKeyHex, source)
}

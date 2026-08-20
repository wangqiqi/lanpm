import { createHash } from 'node:crypto'

export const LANPM_PEER_FILE_VERSION = 1 as const

export interface LanpmPeerFileV1 {
  v: typeof LANPM_PEER_FILE_VERSION
  host: string
  port: number
  deviceId: string
  displayName: string
  fingerprint: string
  /** 本机 ECDH 公钥（hex）；缺省时导入仍走握手 TOFU */
  publicKeyHex?: string
}

export type LanpmPeerFileInput = {
  host: string
  port: number
  deviceId: string
  displayName: string
  publicKeyHex?: string
}

export function peerFileFingerprintPayload(
  input: Pick<LanpmPeerFileV1, 'v' | 'host' | 'port' | 'deviceId' | 'displayName' | 'publicKeyHex'>
): string {
  const base = `${input.v}|${input.host}|${input.port}|${input.deviceId}|${input.displayName}`
  if (input.publicKeyHex) {
    return `${base}|pk|${input.publicKeyHex.trim().toLowerCase()}`
  }
  return base
}

export function computePeerFileFingerprint(input: LanpmPeerFileInput): string {
  return createHash('sha256')
    .update(peerFileFingerprintPayload({ v: LANPM_PEER_FILE_VERSION, ...input }), 'utf8')
    .digest('hex')
}

export function buildLanpmPeerFile(input: LanpmPeerFileInput): LanpmPeerFileV1 {
  const publicKeyHex = input.publicKeyHex?.trim().toLowerCase() || undefined
  const payload = {
    host: input.host,
    port: input.port,
    deviceId: input.deviceId,
    displayName: input.displayName,
    ...(publicKeyHex ? { publicKeyHex } : {})
  }
  return {
    v: LANPM_PEER_FILE_VERSION,
    ...payload,
    fingerprint: computePeerFileFingerprint(payload)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseLanpmPeerFile(raw: unknown): LanpmPeerFileV1 {
  if (!isRecord(raw)) {
    throw new Error('peer_file_invalid')
  }
  if (raw.v !== LANPM_PEER_FILE_VERSION) {
    throw new Error('peer_file_unsupported_version')
  }
  const host = raw.host
  const port = raw.port
  const deviceId = raw.deviceId
  const displayName = raw.displayName
  const fingerprint = raw.fingerprint
  const publicKeyHexRaw = raw.publicKeyHex
  if (typeof host !== 'string' || !host.trim()) {
    throw new Error('peer_file_invalid_host')
  }
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('peer_file_invalid_port')
  }
  if (typeof deviceId !== 'string' || !deviceId.trim()) {
    throw new Error('peer_file_invalid_device')
  }
  if (typeof displayName !== 'string' || !displayName.trim()) {
    throw new Error('peer_file_invalid_name')
  }
  if (typeof fingerprint !== 'string' || !fingerprint.trim()) {
    throw new Error('peer_file_invalid_fingerprint')
  }
  let publicKeyHex: string | undefined
  if (publicKeyHexRaw !== undefined) {
    if (typeof publicKeyHexRaw !== 'string' || !/^[0-9a-fA-F]+$/.test(publicKeyHexRaw.trim())) {
      throw new Error('peer_file_invalid_public_key')
    }
    publicKeyHex = publicKeyHexRaw.trim().toLowerCase()
  }

  const file: LanpmPeerFileV1 = {
    v: LANPM_PEER_FILE_VERSION,
    host: host.trim(),
    port,
    deviceId: deviceId.trim(),
    displayName: displayName.trim(),
    fingerprint: fingerprint.trim(),
    ...(publicKeyHex ? { publicKeyHex } : {})
  }
  const expected = computePeerFileFingerprint(file)
  if (expected !== file.fingerprint) {
    throw new Error('peer_file_fingerprint_mismatch')
  }
  return file
}

export function parseLanpmPeerFileJson(text: string): LanpmPeerFileV1 {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('peer_file_invalid_json')
  }
  return parseLanpmPeerFile(raw)
}

export function serializeLanpmPeerFile(file: LanpmPeerFileV1): string {
  return `${JSON.stringify(file, null, 2)}\n`
}

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { SyncEnvelope } from '../../shared/network/types'
import {
  encodeFileChunkFrame,
  isFileChunkBinaryPayload,
  tryDecodeFileChunkFrame
} from '../../shared/file/chunkFrame'

const ALGO = 'aes-256-gcm'

export interface SealedPayload {
  ciphertext: Buffer
  nonce: string
  authTag: string
}

export function sealBytes(aesKey: Buffer, plaintext: Buffer): SealedPayload {
  const nonce = randomBytes(12)
  const cipher = createCipheriv(ALGO, aesKey, nonce)
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: enc,
    nonce: nonce.toString('base64'),
    authTag: tag.toString('base64')
  }
}

export function openBytes(
  aesKey: Buffer,
  ciphertext: Buffer,
  nonceB64: string,
  authTagB64: string
): Buffer {
  const nonce = Buffer.from(nonceB64, 'base64')
  const tag = Buffer.from(authTagB64, 'base64')
  const decipher = createDecipheriv(ALGO, aesKey, nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

function payloadPlaintext(envelope: SyncEnvelope): Buffer {
  if (envelope.type === 'file_chunk' && isFileChunkBinaryPayload(envelope.payload)) {
    return encodeFileChunkFrame(envelope.payload)
  }
  return Buffer.from(JSON.stringify(envelope.payload ?? null), 'utf8')
}

export type SealedEnvelopeParts = {
  meta: Omit<SyncEnvelope, 'payload'>
  ciphertext: Buffer
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Ciphertext from JSON `__enc` or raw Buffer payload (TASK-4202). */
export function sealedCiphertextFromPayload(payload: unknown): Buffer | null {
  if (Buffer.isBuffer(payload)) return payload
  if (!isRecord(payload)) return null
  if (Buffer.isBuffer(payload.__encBin)) return payload.__encBin
  if (typeof payload.__enc === 'string' && payload.__enc.length > 0) {
    return Buffer.from(payload.__enc, 'base64')
  }
  return null
}

export function sealEnvelopeParts(aesKey: Buffer, envelope: SyncEnvelope): SealedEnvelopeParts {
  const sealed = sealBytes(aesKey, payloadPlaintext(envelope))
  const { payload: _payload, ...meta } = envelope
  return {
    meta: { ...meta, nonce: sealed.nonce, authTag: sealed.authTag },
    ciphertext: sealed.ciphertext
  }
}

export function sealEnvelope(aesKey: Buffer, envelope: SyncEnvelope): SyncEnvelope {
  const { meta, ciphertext } = sealEnvelopeParts(aesKey, envelope)
  return {
    ...envelope,
    ...meta,
    payload: { __enc: ciphertext.toString('base64') }
  }
}

export function openSealedBytes(
  aesKey: Buffer,
  meta: Omit<SyncEnvelope, 'payload'>,
  ciphertext: Buffer
): SyncEnvelope {
  if (!meta.nonce || !meta.authTag) {
    throw new Error('envelope not sealed')
  }
  const plain = openBytes(aesKey, ciphertext, meta.nonce, meta.authTag)
  const framed = tryDecodeFileChunkFrame(plain)
  const payload: unknown = framed ?? (JSON.parse(plain.toString('utf8')) as unknown)
  return { ...meta, payload }
}

export function openEnvelope(aesKey: Buffer, envelope: SyncEnvelope): SyncEnvelope {
  const ciphertext = sealedCiphertextFromPayload(envelope.payload)
  if (!ciphertext || !envelope.nonce || !envelope.authTag) {
    throw new Error('envelope not sealed')
  }
  const { payload: _payload, ...meta } = envelope
  return openSealedBytes(aesKey, meta, ciphertext)
}

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import type { SyncEnvelope } from '../../shared/network/types'

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

export function sealEnvelope(aesKey: Buffer, envelope: SyncEnvelope): SyncEnvelope {
  const body = JSON.stringify(envelope.payload ?? null)
  const sealed = sealBytes(aesKey, Buffer.from(body, 'utf8'))
  return {
    ...envelope,
    payload: { __enc: sealed.ciphertext.toString('base64') },
    nonce: sealed.nonce,
    authTag: sealed.authTag
  }
}

export function openEnvelope(aesKey: Buffer, envelope: SyncEnvelope): SyncEnvelope {
  const wrapped = envelope.payload as { __enc?: string }
  if (!wrapped?.__enc || !envelope.nonce || !envelope.authTag) {
    return envelope
  }
  const plain = openBytes(
    aesKey,
    Buffer.from(wrapped.__enc, 'base64'),
    envelope.nonce,
    envelope.authTag
  )
  return {
    ...envelope,
    payload: JSON.parse(plain.toString('utf8')) as unknown
  }
}

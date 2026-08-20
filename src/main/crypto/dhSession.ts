import { createECDH, createHash, randomBytes } from 'crypto'
import { normalizePairingCode } from '../../shared/network/pairingTypes.ts'

const CURVE = 'prime256v1'

export interface DhKeyPair {
  publicKey: Buffer
  privateKey: Buffer
}

export function generateDhKeyPair(): DhKeyPair {
  const ecdh = createECDH(CURVE)
  ecdh.generateKeys()
  return { publicKey: ecdh.getPublicKey(), privateKey: ecdh.getPrivateKey() }
}

export function deriveSharedSecret(privateKey: Buffer, peerPublicKey: Buffer): Buffer {
  const ecdh = createECDH(CURVE)
  ecdh.setPrivateKey(privateKey)
  return ecdh.computeSecret(peerPublicKey)
}

export function deriveAesKey(sharedSecret: Buffer, salt?: Buffer): Buffer {
  const s = salt ?? Buffer.alloc(0)
  return createHash('sha256').update(Buffer.concat([Buffer.from('lanpm-aes-v1'), sharedSecret, s])).digest()
}

/** pairing 成功后混入 KDF，中间人没有码就解不开 AES。 */
export function kdfSaltFromPairingCode(code: string): Buffer {
  return createHash('sha256')
    .update('lanpm-pair-kdf-v1')
    .update(normalizePairingCode(code), 'utf8')
    .digest()
}

export function randomNonce(bytes = 12): Buffer {
  return randomBytes(bytes)
}

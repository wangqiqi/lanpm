import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { generateDhKeyPair, type DhKeyPair } from './dhSession.ts'
import { resolveP2pAuthDir } from './p2pAuthPaths.ts'

interface DeviceKeyFile {
  version: 1
  keys: Record<string, { publicKeyHex: string; privateKeyHex: string }>
}

function storePath(): string {
  return join(resolveP2pAuthDir(), 'device-ecdh.json')
}

function readFile(): DeviceKeyFile {
  const path = storePath()
  if (!existsSync(path)) return { version: 1, keys: {} }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as DeviceKeyFile
    if (raw?.version !== 1 || !raw.keys || typeof raw.keys !== 'object') {
      return { version: 1, keys: {} }
    }
    return raw
  } catch {
    return { version: 1, keys: {} }
  }
}

function writeFile(data: DeviceKeyFile): void {
  const path = storePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function toPair(row: { publicKeyHex: string; privateKeyHex: string }): DhKeyPair {
  return {
    publicKey: Buffer.from(row.publicKeyHex, 'hex'),
    privateKey: Buffer.from(row.privateKeyHex, 'hex')
  }
}

/** 本机长效 ECDH：同一 deviceId 跨连接复用，否则 TOFU 钉钥无法在重连后校验。 */
export function loadOrCreateDeviceKeyPair(deviceId: string): DhKeyPair {
  const file = readFile()
  const existing = file.keys[deviceId]
  if (existing?.publicKeyHex && existing.privateKeyHex) {
    return toPair(existing)
  }
  const generated = generateDhKeyPair()
  file.keys[deviceId] = {
    publicKeyHex: generated.publicKey.toString('hex'),
    privateKeyHex: generated.privateKey.toString('hex')
  }
  writeFile(file)
  return generated
}

export function getDevicePublicKeyHex(deviceId: string): string {
  return loadOrCreateDeviceKeyPair(deviceId).publicKey.toString('hex')
}

import { createHash, createPublicKey, verify as cryptoVerify } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PLUGIN_SIGNATURE_ALGORITHM,
  PLUGIN_SIGNATURE_FILE,
  type PluginSignatureFile
} from '../../shared/plugin/sideloadFormat.ts'

/** Host 内置公钥（POC）；生产可换渠道密钥 */
const HOST_TRUSTED_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA7d8vJ8xqZ0nHk3pL9mR2wY4tF6uC1vB8nK5jQ0xA7eM=
-----END PUBLIC KEY-----`

function isPackagedHost(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    return Boolean(app?.isPackaged)
  } catch {
    return false
  }
}

/** Unpackaged tests/dev may skip; packaged Host never skips. */
export function shouldSkipPluginSignatureVerify(
  env: NodeJS.ProcessEnv = process.env,
  packaged: boolean = isPackagedHost()
): boolean {
  if (packaged) return false
  if (env.LANPM_PLUGIN_SKIP_VERIFY === '1') return true
  if (env.NODE_ENV === 'test') return true
  return false
}

function parseSignatureFile(raw: unknown): PluginSignatureFile | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (o.algorithm !== PLUGIN_SIGNATURE_ALGORITHM) return null
  if (typeof o.manifestSha256 !== 'string' || !o.manifestSha256.trim()) return null
  if (typeof o.signature !== 'string' || !o.signature.trim()) return null
  const file: PluginSignatureFile = {
    algorithm: PLUGIN_SIGNATURE_ALGORITHM,
    manifestSha256: o.manifestSha256.trim(),
    signature: o.signature.trim()
  }
  if (typeof o.publisher === 'string' && o.publisher.trim()) {
    file.publisher = o.publisher.trim()
  }
  return file
}

function sha256Hex(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex')
}

/**
 * 校验侧载插件目录签名。builtin 不调用。
 * 开发 / 测试可 `LANPM_PLUGIN_SKIP_VERIFY=1` 跳过。
 */
export function verifyPluginDirectorySignature(pluginDir: string): boolean {
  if (shouldSkipPluginSignatureVerify()) return true
  const manifestPath = join(pluginDir, 'plugin.json')
  const signaturePath = join(pluginDir, PLUGIN_SIGNATURE_FILE)
  if (!existsSync(manifestPath) || !existsSync(signaturePath)) return false
  let signatureRaw: unknown
  try {
    signatureRaw = JSON.parse(readFileSync(signaturePath, 'utf8'))
  } catch {
    return false
  }
  const signatureFile = parseSignatureFile(signatureRaw)
  if (!signatureFile) return false
  const manifestBytes = readFileSync(manifestPath)
  const digest = sha256Hex(manifestBytes)
  if (digest !== signatureFile.manifestSha256) return false
  try {
    const key = createPublicKey(HOST_TRUSTED_PUBLIC_KEY_PEM)
    return cryptoVerify(
      null,
      manifestBytes,
      key,
      Buffer.from(signatureFile.signature, 'base64')
    )
  } catch {
    return false
  }
}

export function readPluginSignatureFile(pluginDir: string): PluginSignatureFile | null {
  const signaturePath = join(pluginDir, PLUGIN_SIGNATURE_FILE)
  if (!existsSync(signaturePath)) return null
  try {
    return parseSignatureFile(JSON.parse(readFileSync(signaturePath, 'utf8')))
  } catch {
    return null
  }
}

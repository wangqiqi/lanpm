import { createPublicKey, verify as cryptoVerify } from 'node:crypto'
import type { PluginLicenseGrant, SignedPluginLicense, UnsignedPluginLicense } from '../../shared/plugin/sideloadFormat.ts'
import {
  PLUGIN_LICENSE_FILE_VERSION,
  PLUGIN_SIGNATURE_ALGORITHM
} from '../../shared/plugin/sideloadFormat.ts'
import { canonicalizeLicensePayload, isSignedPluginLicense } from '../../shared/plugin/licenseCanonical.ts'
import { LICENSE_ISSUER_PUBLIC_KEY_PEM } from './licenseKeys.ts'
import { shouldBypassPaidPluginLicense } from '../../shared/plugin/licenseDevBypass.ts'
import { getLocalMachineId } from './machineId.ts'

export function shouldSkipLicenseVerify(): boolean {
  return shouldBypassPaidPluginLicense()
}

function parseSignedLicense(raw: unknown): SignedPluginLicense | null {
  if (!isSignedPluginLicense(raw)) return null
  const o = raw as Record<string, unknown>
  if (o.version !== PLUGIN_LICENSE_FILE_VERSION) return null
  if (typeof o.machineId !== 'string' || !o.machineId.trim()) return null
  if (typeof o.issuedAt !== 'number' || !Number.isFinite(o.issuedAt)) return null
  if (o.term !== 'trial' && o.term !== 'perpetual') return null
  if (o.algorithm !== PLUGIN_SIGNATURE_ALGORITHM) return null
  if (!Array.isArray(o.grants)) return null
  const grants: PluginLicenseGrant[] = []
  for (const item of o.grants) {
    if (!item || typeof item !== 'object') continue
    const g = item as PluginLicenseGrant
    if (typeof g.pluginId !== 'string' || !g.pluginId.trim()) continue
    if (!Array.isArray(g.features)) continue
    const features = g.features.filter((f): f is string => typeof f === 'string')
    if (features.length === 0) continue
    grants.push({
      pluginId: g.pluginId.trim(),
      features,
      issuedAt: typeof g.issuedAt === 'number' ? g.issuedAt : undefined,
      expiresAt: typeof g.expiresAt === 'number' ? g.expiresAt : undefined
    })
  }
  if (grants.length === 0) return null
  return {
    version: PLUGIN_LICENSE_FILE_VERSION,
    machineId: o.machineId.trim(),
    issuedAt: o.issuedAt,
    term: o.term,
    grants,
    algorithm: PLUGIN_SIGNATURE_ALGORITHM,
    signature: String(o.signature).trim()
  }
}

export function verifySignedLicenseSignature(license: SignedPluginLicense): boolean {
  if (shouldSkipLicenseVerify()) return true
  const unsigned: UnsignedPluginLicense = {
    version: license.version,
    machineId: license.machineId,
    issuedAt: license.issuedAt,
    term: license.term,
    grants: license.grants,
    algorithm: license.algorithm
  }
  const message = Buffer.from(canonicalizeLicensePayload(unsigned), 'utf8')
  try {
    const key = createPublicKey(LICENSE_ISSUER_PUBLIC_KEY_PEM)
    return cryptoVerify(
      null,
      message,
      key,
      Buffer.from(license.signature, 'base64')
    )
  } catch {
    return false
  }
}

export function assertLicenseMachineMatches(license: SignedPluginLicense): void {
  if (shouldSkipLicenseVerify()) return
  const local = getLocalMachineId()
  if (license.machineId !== local) {
    throw new Error('plugin.licenseMachineMismatch')
  }
}

export function extractGrantsFromSignedLicense(raw: unknown): PluginLicenseGrant[] {
  const license = parseSignedLicense(raw)
  if (!license) throw new Error('plugin.licenseInvalidPayload')
  if (!verifySignedLicenseSignature(license)) {
    throw new Error('plugin.licenseSignatureInvalid')
  }
  assertLicenseMachineMatches(license)
  const now = Date.now()
  const active = license.grants.filter((g) => g.expiresAt == null || g.expiresAt > now)
  if (active.length === 0) throw new Error('plugin.licenseExpired')
  return active
}

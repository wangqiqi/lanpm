import type { PluginLicenseGrant, UnsignedPluginLicense } from './sideloadFormat.ts'

/** 签名/验签用的稳定 JSON（字段顺序固定） */
export function canonicalizeLicensePayload(license: UnsignedPluginLicense): string {
  const grants = [...license.grants]
    .map((g) => normalizeGrant(g))
    .sort((a, b) => a.pluginId.localeCompare(b.pluginId))

  const payload = {
    version: license.version,
    machineId: license.machineId,
    issuedAt: license.issuedAt,
    term: license.term,
    grants,
    algorithm: license.algorithm
  }
  return JSON.stringify(payload)
}

function normalizeGrant(grant: PluginLicenseGrant): PluginLicenseGrant {
  const out: PluginLicenseGrant = {
    pluginId: grant.pluginId,
    features: [...grant.features].sort()
  }
  if (grant.issuedAt != null) out.issuedAt = grant.issuedAt
  if (grant.expiresAt != null) out.expiresAt = grant.expiresAt
  return out
}

export function isSignedPluginLicense(raw: unknown): raw is Record<string, unknown> & { signature: string } {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  return typeof o.signature === 'string' && o.signature.trim().length > 0
}

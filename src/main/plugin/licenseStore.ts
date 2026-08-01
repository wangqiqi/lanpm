import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import type { PluginLicenseGrant, PluginLicenseStatus, PluginLicenseStore } from '../../shared/plugin/licenseTypes.ts'
import { PLUGIN_LICENSES_FILE } from '../../shared/plugin/sideloadFormat.ts'
import { isSignedPluginLicense } from '../../shared/plugin/licenseCanonical.ts'
import { shouldBypassPaidPluginLicense } from '../../shared/plugin/licenseDevBypass.ts'
import { extractGrantsFromSignedLicense } from './licenseVerify.ts'

function licensesPath(): string {
  return join(app.getPath('userData'), PLUGIN_LICENSES_FILE)
}

export function readLicenseStore(): PluginLicenseStore {
  const path = licensesPath()
  if (!existsSync(path)) return { grants: [] }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (!raw || typeof raw !== 'object') return { grants: [] }
    const grantsRaw = (raw as PluginLicenseStore).grants
    if (!Array.isArray(grantsRaw)) return { grants: [] }
    const grants: PluginLicenseGrant[] = []
    for (const item of grantsRaw) {
      if (!item || typeof item !== 'object') continue
      const o = item as PluginLicenseGrant
      if (typeof o.pluginId !== 'string' || !o.pluginId.trim()) continue
      if (!Array.isArray(o.features)) continue
      const features = o.features.filter((f): f is string => typeof f === 'string')
      grants.push({
        pluginId: o.pluginId.trim(),
        features,
        issuedAt: typeof o.issuedAt === 'number' ? o.issuedAt : undefined,
        expiresAt: typeof o.expiresAt === 'number' ? o.expiresAt : undefined
      })
    }
    return { grants }
  } catch {
    return { grants: [] }
  }
}

function writeLicenseStore(store: PluginLicenseStore): void {
  const path = licensesPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8')
}

function grantIsActive(grant: PluginLicenseGrant, now = Date.now()): boolean {
  if (grant.expiresAt != null && grant.expiresAt <= now) return false
  return grant.features.includes('license.feature') || grant.features.length > 0
}

export function isPluginLicensed(pluginId: string, now = Date.now()): boolean {
  if (shouldBypassPaidPluginLicense()) return true
  const grant = readLicenseStore().grants.find((g) => g.pluginId === pluginId)
  if (!grant) return false
  return grantIsActive(grant, now)
}

export function getPluginLicenseStatus(pluginId: string, now = Date.now()): PluginLicenseStatus {
  if (shouldBypassPaidPluginLicense()) {
    return { pluginId, licensed: true, features: ['license.feature'] }
  }
  const grant = readLicenseStore().grants.find((g) => g.pluginId === pluginId)
  if (!grant) {
    return { pluginId, licensed: false, features: [] }
  }
  const licensed = grantIsActive(grant, now)
  return {
    pluginId,
    licensed,
    features: grant.features,
    expiresAt: grant.expiresAt
  }
}

/** 导入签名离线许可证 JSON（`SignedPluginLicense`） */
export function importPluginLicense(raw: unknown): PluginLicenseStatus {
  if (!isSignedPluginLicense(raw)) {
    throw new Error('plugin.licenseInvalidPayload')
  }
  const incoming = extractGrantsFromSignedLicense(raw)
  if (incoming.length === 0) throw new Error('plugin.licenseInvalidPayload')
  const store = readLicenseStore()
  for (const grant of incoming) {
    const idx = store.grants.findIndex((g) => g.pluginId === grant.pluginId)
    if (idx >= 0) store.grants[idx] = grant
    else store.grants.push(grant)
  }
  writeLicenseStore(store)
  const last = incoming[incoming.length - 1]!
  return getPluginLicenseStatus(last.pluginId)
}

export function assertPaidPluginLicensed(
  pluginId: string,
  pricing: 'free' | 'paid'
): void {
  if (pricing !== 'paid') return
  if (shouldBypassPaidPluginLicense()) return
  if (!isPluginLicensed(pluginId)) {
    throw new Error(`license required for paid plugin: ${pluginId}`)
  }
}

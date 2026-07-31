/** 侧载插件包格式 SSOT（§8 · plugin-market-spike） */

/** userData 下侧载根目录名 */
export const SIDELOAD_PLUGINS_DIR = 'sideload-plugins'

/** 与 `plugin.json` 同目录的签名文件 */
export const PLUGIN_SIGNATURE_FILE = 'signature.json'

/** userData 离线许可证存储文件名 */
export const PLUGIN_LICENSES_FILE = 'plugin-licenses.json'

/** 当前支持的签名算法 */
export const PLUGIN_SIGNATURE_ALGORITHM = 'ed25519' as const

export type PluginSignatureFile = {
  algorithm: typeof PLUGIN_SIGNATURE_ALGORITHM
  /** `plugin.json` 原文 SHA-256 hex */
  manifestSha256: string
  /** Ed25519 签名（base64） */
  signature: string
  /** 可选：签发者标识 */
  publisher?: string
}

export type PluginLicenseGrant = {
  pluginId: string
  features: string[]
  issuedAt?: number
  expiresAt?: number
}

export type PluginLicenseStore = {
  grants: PluginLicenseGrant[]
}

export type PluginLicenseStatus = {
  pluginId: string
  licensed: boolean
  features: string[]
  expiresAt?: number
}

/**
 * 开发 / 测试专用：显式环境变量时跳过付费插件许可证闸。
 * 未打包 dist（`out/`、`dist/*-unpacked`）与 `app.isPackaged` 打包产物均须正式授权，除非命中下列开关。
 * 真源：`docs/07_插件与扩展.md` · `scripts/dev-run.mjs` 注入 `LANPM_LICENSE_SKIP_VERIFY=1`
 */

function readProcessEnv(name: string): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined
  return process.env[name]
}

/** 签名验证与运行时付费闸共用（勿用于生产打包路径）。 */
export function shouldBypassPaidPluginLicense(): boolean {
  if (readProcessEnv('LANPM_LICENSE_SKIP_VERIFY') === '1') return true
  const nodeEnv = readProcessEnv('NODE_ENV')
  if (nodeEnv === 'test' || nodeEnv === 'development') return true
  if (readProcessEnv('LANPM_NETWORK') === 'stub') return true
  if (readProcessEnv('LANPM_VISUAL_CAPTURE_DIR')) return true
  if (readProcessEnv('LANPM_E2E') === '1') return true
  if (readProcessEnv('LANPM_BROWSER_DEV') === '1') return true
  return false
}

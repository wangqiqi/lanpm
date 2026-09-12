/** 显式允许多实例（E2E、并行 stub 手验等）；默认每台机器仅一个 LanPM。 */
export const LANPM_ALLOW_MULTI_INSTANCE_ENV = 'LANPM_ALLOW_MULTI_INSTANCE'

export function shouldAllowMultipleLanpmInstances(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env[LANPM_ALLOW_MULTI_INSTANCE_ENV] === '1') return true
  if (env.LANPM_E2E === '1') return true
  if (env.LANPM_VISUAL_CAPTURE_DIR?.trim()) return true
  return false
}

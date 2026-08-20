/** Linux GPU: default off (Electron FATAL without Vulkan). Opt-in: LANPM_ENABLE_GPU=1 */

export const LANPM_ENABLE_GPU_ENV = 'LANPM_ENABLE_GPU'

export const LINUX_DISABLE_GPU_SWITCHES = [
  'disable-gpu',
  'disable-gpu-sandbox',
  'disable-accelerated-video-decode',
  'disable-accelerated-video-encode'
] as const

export function isLanpmGpuOptIn(env: NodeJS.Dict<string | undefined> = process.env): boolean {
  return env[LANPM_ENABLE_GPU_ENV] === '1'
}

export function shouldDisableLinuxGpu(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.Dict<string | undefined> = process.env
): boolean {
  if (platform !== 'linux') return false
  return !isLanpmGpuOptIn(env)
}

export function linuxGpuNote(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.Dict<string | undefined> = process.env
): string {
  if (platform !== 'linux') return 'gpu-policy-unspecified'
  if (isLanpmGpuOptIn(env)) {
    return 'linux-LANPM_ENABLE_GPU=1 (hardware acceleration opt-in); compare RSS to default-off'
  }
  return 'linux-disableHardwareAcceleration (default); set LANPM_ENABLE_GPU=1 to opt in; not comparable to GPU-on budgets'
}

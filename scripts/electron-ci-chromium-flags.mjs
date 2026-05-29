/**
 * Extra Chromium flags when spawning Electron on Linux CI (GHA, Docker).
 * SUID chrome-sandbox is usually not configured; see electron/electron#42510.
 * Testing / CI only — do not use for end-user production launches.
 */
export function electronCiChromiumFlags() {
  const inCi = process.env.CI === 'true' || process.env.CI === '1'
  if (!inCi || process.platform !== 'linux') return []
  return ['--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage']
}

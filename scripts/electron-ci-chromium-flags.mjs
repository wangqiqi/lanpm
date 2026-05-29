/**
 * Chromium flags for full Electron app launches on Linux CI (GHA, Docker).
 * Do NOT pass these when ELECTRON_RUN_AS_NODE=1 (Node-only probe / run-electron-node).
 * SUID chrome-sandbox is usually not configured; see electron/electron#42510.
 */
export function electronCiChromiumFlags() {
  const inCi = process.env.CI === 'true' || process.env.CI === '1'
  if (!inCi || process.platform !== 'linux') return []
  return ['--no-sandbox', '--disable-gpu-sandbox', '--disable-dev-shm-usage']
}

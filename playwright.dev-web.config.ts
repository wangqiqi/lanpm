import { defineConfig } from '@playwright/test'
import { playwrightTestResultsDir, repoRoot } from './scripts/lanpm-artifact-paths.mjs'

/**
 * `dev:web` smoke — Chromium + Vite renderer stub（非 Electron 验收真源）。
 * webServer 设 LANPM_E2E_DEV_WEB=1 固定 :5173；本地可 reuseExistingServer。
 * 端口被占时先停其它 dev:web，或读 docs/05 §1.2.8 · `.lanpm/dev.url`。
 */
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'dev-web-smoke.spec.ts',
  outputDir: playwrightTestResultsDir(repoRoot()),
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: 'npm run dev:web',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      LANPM_E2E_DEV_WEB: '1'
    }
  }
})

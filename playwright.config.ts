import { defineConfig } from '@playwright/test'
import { playwrightTestResultsDir, repoRoot } from './scripts/lanpm-artifact-paths.mjs'

export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: playwrightTestResultsDir(repoRoot()),
  timeout: 180_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    trace: 'retain-on-failure'
  }
})

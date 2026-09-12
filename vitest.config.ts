import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { coverageDir, repoRoot } from './scripts/lanpm-artifact-paths.mjs'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reportsDirectory: coverageDir(repoRoot()),
      include: ['src/shared/**/*.ts'],
      exclude: ['**/*.d.ts', 'src/shared/**/channels.ts', 'src/shared/lanpm-api.ts'],
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 80
      }
    }
  }
})

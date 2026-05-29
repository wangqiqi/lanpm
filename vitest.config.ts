import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared')
    }
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    globals: false,
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
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

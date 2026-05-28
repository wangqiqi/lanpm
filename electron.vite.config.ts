import { copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const root = dirname(fileURLToPath(import.meta.url))

function copySchemaSqlPlugin(): Plugin {
  return {
    name: 'copy-schema-sql',
    closeBundle() {
      const outDir = join(root, 'out/main')
      mkdirSync(outDir, { recursive: true })
      copyFileSync(
        join(root, 'src/main/storage/schema.sql'),
        join(outDir, 'schema.sql')
      )
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copySchemaSqlPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          /** preload 在 Electron 沙箱中必须以 CJS 运行，ESM 会报 import outside module */
          format: 'cjs',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@resources': resolve('resources')
      }
    },
    plugins: [react()]
  }
})

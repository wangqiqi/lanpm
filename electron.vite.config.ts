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
    /**
     * electron-vite 预设 ssr.noExternal=true 会把 npm 包 electron/index.js 打进 preload（含 require('fs')），
     * 沙箱下 preload 失败、窗口空白。须显式 externalize 运行时模块 electron。
     */
    ssr: {
      external: ['electron']
    },
    build: {
      externalizeDeps: false,
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

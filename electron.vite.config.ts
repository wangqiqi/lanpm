import dns from 'node:dns'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

/** Node 17+ 默认先解析 localhost → ::1；开发服务若只监听 127.0.0.1 会导致 http://localhost 连不上 */
dns.setDefaultResultOrder('ipv4first')

const root = dirname(fileURLToPath(import.meta.url))

/** 开发态 Vite 会注入 inline script / HMR；index.html 的生产 CSP 会阻止浏览器与 Cursor 预览加载 */
function lanpmDevCspPlugin(): Plugin {
  return {
    name: 'lanpm-dev-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.server) return html
        /* 开发态移除 CSP：Vite HMR / Cursor 内置浏览器对 port 通配 CSP 支持差，易导致白屏 */
        return html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>\s*/i, '')
      }
    }
  }
}

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
    server: {
      /** 0.0.0.0：同时接受 127.0.0.1；配合 dns.setDefaultResultOrder('ipv4first') 改善 localhost */
      host: true,
      strictPort: false,
      hmr: {
        /** 避免页面在 ::/localhost 与 ws 地址不一致时 HMR 连不上 → 整页反复刷新 */
        host: '127.0.0.1',
        protocol: 'ws'
      }
    },
    plugins: [react(), lanpmDevCspPlugin()]
  }
})

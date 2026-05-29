import dns from 'node:dns'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { HotPayload, Plugin } from 'vite'

/** Node 17+ 默认先解析 localhost → ::1；配合 host: 'localhost' 一般可同时访问 localhost / 127.0.0.1 */
dns.setDefaultResultOrder('ipv4first')

const root = dirname(fileURLToPath(import.meta.url))
const isBrowserDev = process.env.LANPM_BROWSER_DEV === '1'

/** 开发态移除 CSP，避免 Vite 内联脚本被拦 */
function lanpmDevCspPlugin(): Plugin {
  return {
    name: 'lanpm-dev-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (!ctx.server) return html
        return html.replace(/<meta\s+http-equiv="Content-Security-Policy"[^>]*>\s*/i, '')
      }
    }
  }
}

/** 开发态 HTML：禁用 Vite 错误遮罩（Cursor 内嵌浏览器里常挡住全部点击） */
function lanpmDevOverlayGuardHtmlPlugin(): Plugin {
  return {
    name: 'lanpm-dev-overlay-guard-html',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const patch = `<style id="lanpm-dev-overlay-guard">
vite-error-overlay{display:none!important;pointer-events:none!important}
html[data-lanpm-browser-preview],html[data-lanpm-browser-preview] body,html[data-lanpm-browser-preview] #root{pointer-events:auto!important}
</style>`
        return html.includes('</head>') ? html.replace('</head>', `${patch}</head>`) : patch + html
      }
    }
  }
}

/**
 * electron-vite 在 preload 重建时会 server.ws.send({ type: 'full-reload' })，
 * 连到同一 Vite 端口的浏览器/Cursor 预览也会跟着整页刷新，形成“无法点击”的刷新风暴。
 */
function lanpmFullReloadGuardPlugin(): Plugin {
  return {
    name: 'lanpm-full-reload-guard',
    apply: 'serve',
    configureServer(server) {
      const send = server.ws.send.bind(server.ws)
      server.ws.send = (payload: HotPayload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'type' in payload &&
          payload.type === 'full-reload'
        ) {
          server.config.logger.info(
            '[lanpm] 已忽略 full-reload（开发态；Electron 内请手动刷新，浏览器请用 npm run dev:web）'
          )
          return
        }
        return send(payload)
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
    ssr: {
      external: ['electron']
    },
    build: {
      externalizeDeps: false,
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: [
        { find: '@renderer', replacement: resolve('src/renderer/src') },
        { find: '@shared', replacement: resolve('src/shared') },
        { find: '@resources', replacement: resolve('resources') },
        // Exact package id only; subpaths like dist/index.css stay on the package dir
        {
          find: /^gantt-task-react$/,
          replacement: resolve('node_modules/gantt-task-react/dist/index.js')
        }
      ]
    },
    server: {
      host: 'localhost',
      strictPort: false,
      /** 浏览器专用 dev：关闭 HMR；其它开发态也关闭错误遮罩，避免 Cursor 内嵌页无法点击 */
      hmr: isBrowserDev ? false : { overlay: false },
      watch: {
        ignored: ['**/out/**', '**/.git/**', '**/node_modules/**', '**/*.db', '**/.config/**']
      }
    },
    plugins: [
      react(),
      lanpmDevCspPlugin(),
      lanpmDevOverlayGuardHtmlPlugin(),
      lanpmFullReloadGuardPlugin()
    ]
  }
})

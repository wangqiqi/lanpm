import type { LanpmApi } from '@shared/lanpm-api'
import { createBrowserLanpmStub } from '@renderer/platform/browserLanpmStub'

function isElectronRenderer(): boolean {
  return typeof navigator !== 'undefined' && /\bElectron\b/i.test(navigator.userAgent)
}

/** 在 Electron preload 未注入时（如浏览器打开 :5173）安装开发桩 */
export function installLanpmBridge(): void {
  if (typeof window === 'undefined' || window.lanpm) return

  if (import.meta.env.DEV) {
    if (isElectronRenderer()) {
      console.warn(
        '[lanpm] 检测到 Electron UA 但未注入 preload，使用浏览器开发桩。' +
          '若为本应用窗口请检查主进程 preload 路径；Cursor 内置浏览器属正常情况。'
      )
    } else {
      console.info(
        '[lanpm] 浏览器/Cursor 预览模式：使用 localStorage 开发桩。完整能力请用 npm run dev 打开的 Electron 窗口。'
      )
    }
    window.lanpm = createBrowserLanpmStub()
    return
  }

  if (isElectronRenderer()) {
    console.error(
      '[lanpm] Electron 窗口未注入 preload，无法读取本机主机名。请检查主进程 preload 路径。'
    )
    return
  }

  console.error(
    '[lanpm] window.lanpm 未注入。请通过 Electron 启动应用（npm run dev），勿在浏览器中直接打开渲染页。'
  )
}

export function getLanpmApi(): LanpmApi {
  const api = window.lanpm
  if (!api) {
    throw new Error('LanPM API 不可用：请在 Electron 环境中运行，或启用开发模式预览桩。')
  }
  return api
}

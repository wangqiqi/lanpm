import type { LanpmApi } from '../../shared/lanpm-api'

declare global {
  interface Window {
    /** Electron preload 注入；浏览器预览时由 installLanpmBridge 写入开发桩 */
    lanpm?: LanpmApi
  }
}

export {}

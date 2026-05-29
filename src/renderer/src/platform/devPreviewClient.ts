/**
 * 浏览器 / Cursor 内嵌预览（非 Electron UA）：
 * 移除 vite-error-overlay（HMR/WebSocket 失败时常挡住整页点击）。
 */
export function installDevPreviewClientGuards(): void {
  if (!import.meta.env.DEV) return
  if (typeof navigator !== 'undefined' && /\bElectron\b/i.test(navigator.userAgent)) {
    return
  }

  document.documentElement.dataset.lanpmBrowserPreview = '1'

  const stripBlockingLayers = (): void => {
    document.querySelectorAll('vite-error-overlay').forEach((el) => el.remove())
    document.body.classList.remove('lanpm-composer-resize')
  }

  stripBlockingLayers()
  const obs = new MutationObserver(stripBlockingLayers)
  obs.observe(document.documentElement, { childList: true, subtree: true })
}

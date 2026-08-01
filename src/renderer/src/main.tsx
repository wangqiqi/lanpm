import { installLanpmBridge } from '@renderer/platform/installLanpmBridge'
import { installDevPreviewClientGuards } from '@renderer/platform/devPreviewClient'
import { bootstrapDocumentTheme } from '@renderer/theme/initialTheme'
import './styles/global.css'

declare global {
  interface Window {
    EXCALIDRAW_ASSET_PATH?: string
  }
}

/** Local prod assets — avoids esm.sh font fallback under strict CSP */
window.EXCALIDRAW_ASSET_PATH = `${import.meta.env.BASE_URL}excalidraw/`

bootstrapDocumentTheme()

function showFatalError(err: unknown): void {
  bootstrapDocumentTheme()
  const root = document.getElementById('root')
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
  console.error('[lanpm] bootstrap failed:', err)
  if (root) {
    const escaped = msg
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    root.innerHTML = `<pre class="lanpm-fatal">${escaped}</pre>`
  }
}

try {
  installLanpmBridge()
  installDevPreviewClientGuards()
  if (import.meta.env.DEV) {
    console.info('[lanpm] renderer boot', window.location.href)
  }
  void import('./bootstrap').catch(showFatalError)
} catch (err) {
  showFatalError(err)
}

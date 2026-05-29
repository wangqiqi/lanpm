import { installLanpmBridge } from '@renderer/platform/installLanpmBridge'
import { installDevPreviewClientGuards } from '@renderer/platform/devPreviewClient'

function showFatalError(err: unknown): void {
  const root = document.getElementById('root')
  const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
  console.error('[lanpm] bootstrap failed:', err)
  if (root) {
    root.innerHTML = `<pre style="margin:24px;padding:12px;font:13px/1.45 ui-monospace,monospace;white-space:pre-wrap;background:#fff;border:1px solid #ddd;border-radius:8px">${msg}</pre>`
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

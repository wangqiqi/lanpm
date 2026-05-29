import { installLanpmBridge } from '@renderer/platform/installLanpmBridge'
import { installDevPreviewClientGuards } from '@renderer/platform/devPreviewClient'
import './styles/global.module.css'

function readThemeDataset(): void {
  const fromQuery =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('theme')
      : null
  if (fromQuery === 'dark' || fromQuery === 'light') {
    localStorage.setItem('theme', fromQuery)
  }
  const theme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

function showFatalError(err: unknown): void {
  readThemeDataset()
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

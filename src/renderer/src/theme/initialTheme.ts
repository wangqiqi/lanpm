export type ThemeMode = 'light' | 'dark'

/** 读取初始主题：localStorage 优先，否则跟随系统偏好 */
export function readInitialTheme(): ThemeMode {
  const saved = localStorage.getItem('theme')
  if (saved === 'dark') return 'dark'
  if (saved === 'light') return 'light'
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  return prefersDark ? 'dark' : 'light'
}

/** 将主题同步到 document（首屏 FOUC 防护与 ThemeProvider 一致） */
export function applyThemeToDocument(theme: ThemeMode): void {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}

/** 处理 ?theme= 查询参数并持久化 */
export function applyThemeQueryParam(): void {
  const fromQuery = new URLSearchParams(window.location.search).get('theme')
  if (fromQuery === 'dark' || fromQuery === 'light') {
    localStorage.setItem('theme', fromQuery)
  }
}

/** 首屏：查询参数 → 读主题 → 写 dataset（bootstrap 前调用） */
export function bootstrapDocumentTheme(): void {
  applyThemeQueryParam()
  applyThemeToDocument(readInitialTheme())
}

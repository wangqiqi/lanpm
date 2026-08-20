/** 处理 ?locale= 查询参数并持久化（无头截图 / 深链） */
export function applyLocaleQueryParam(): void {
  const fromQuery = new URLSearchParams(window.location.search).get('locale')
  if (fromQuery !== 'en-US' && fromQuery !== 'zh-CN') return
  localStorage.setItem('locale', fromQuery)
  document.documentElement.lang = fromQuery === 'en-US' ? 'en' : 'zh-CN'
}

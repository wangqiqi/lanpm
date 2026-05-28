/** 读取根节点 CSS 变量（用于 SVG / 第三方组件无法直接写 var() 的场景） */
export function readCssVar(name: string, fallback = ''): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

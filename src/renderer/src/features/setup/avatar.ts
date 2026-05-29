/** VIS-08：与 global 语义色 / accent 对齐 */
const ACCENT_BY_THEME = {
  light: '#0071e3',
  dark: '#0a84ff'
} as const

const PALETTE = [
  ACCENT_BY_THEME.light,
  '#34c759',
  '#ff9500',
  '#5856d6',
  '#5ac8fa',
  '#ff3b30'
] as const

export type AvatarTheme = keyof typeof ACCENT_BY_THEME

function avatarDataUrl(label: string, color: string): string {
  const initials = label.trim().slice(0, 2).toUpperCase() || 'LP'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="96" height="96" fill="${color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    fill="#ffffff" font-size="36" font-family="system-ui,sans-serif">${escapeXml(initials)}</text>
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** 默认头像：亮/暗均用 accent，避免随机色导致首屏不一致 */
export function defaultAvatarDataUrl(label: string, theme: AvatarTheme = 'light'): string {
  return avatarDataUrl(label, ACCENT_BY_THEME[theme])
}

export function randomAvatarDataUrl(label: string): string {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]
  return avatarDataUrl(label, color)
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

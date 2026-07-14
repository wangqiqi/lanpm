import { LANPM_ACCENT } from '../design/lanpmDesignTokens.ts'

/** 头像 data URL 生成与规范化（主进程 / 渲染进程共用） */

const ACCENT_BY_THEME = {
  light: LANPM_ACCENT.light,
  dark: LANPM_ACCENT.dark
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

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function initialsOf(label: string): string {
  const trimmed = label.trim()
  if (!trimmed) return 'LP'
  if (/^[\u4e00-\u9fff]/.test(trimmed)) return trimmed.slice(0, 1)
  return trimmed.slice(0, 2).toUpperCase()
}

function avatarDataUrl(label: string, color: string): string {
  const initials = initialsOf(label)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
  <rect width="96" height="96" fill="${color}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    fill="#ffffff" font-size="36" font-family="system-ui,sans-serif">${escapeXml(initials)}</text>
</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function hashSeed(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 修复历史非标准 `;utf8,` data URL，避免 Chromium 加载失败 */
export function normalizeAvatarDataUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('data:image/svg+xml;utf8,')) {
    return `data:image/svg+xml;charset=utf-8,${url.slice('data:image/svg+xml;utf8,'.length)}`
  }
  return url
}

/** 默认头像：亮/暗均用 accent */
export function defaultAvatarDataUrl(label: string, theme: AvatarTheme = 'light'): string {
  return avatarDataUrl(label, ACCENT_BY_THEME[theme])
}

export function randomAvatarDataUrl(label: string): string {
  const color = PALETTE[Math.floor(Math.random() * PALETTE.length)]!
  return avatarDataUrl(label, color)
}

/** 按 userId/名字确定性配色，同人同色 */
export function deterministicAvatarDataUrl(label: string, seed: string): string {
  const color = PALETTE[hashSeed(seed || label) % PALETTE.length]!
  return avatarDataUrl(label, color)
}

/** 展示用：优先规范化已有 URL，否则确定性色块 */
export function resolveAvatarSrc(
  avatarUrl: string | undefined | null,
  label: string,
  seed?: string
): string {
  return (
    normalizeAvatarDataUrl(avatarUrl) ??
    deterministicAvatarDataUrl(label, seed ?? label)
  )
}

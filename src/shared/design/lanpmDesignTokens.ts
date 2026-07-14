/**
 * LanPM 设计令牌实色 SSOT（须与 `global.module.css` 同名 CSS 变量保持同步）。
 * Ant Design ThemeProvider 无法对 CSS var 做颜色运算，从此文件引用实色。
 * 守卫：`npm run verify:visual` 校验 ThemeProvider / global 与本文件一致。
 */
export const LANPM_ACCENT = {
  light: '#0066cc',
  lightHover: '#0077e6',
  dark: '#0a84ff',
  darkHover: '#409cff'
} as const

export const LANPM_RADIUS_PX = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20
} as const

/** 与 `--lanpm-accent-fill` / `--lanpm-accent-fill-strong` 对齐 */
export const LANPM_ACCENT_FILL_RGBA = {
  light: 'rgba(0, 102, 204, 0.08)',
  lightStrong: 'rgba(0, 102, 204, 0.12)',
  dark: 'rgba(10, 132, 255, 0.16)',
  darkStrong: 'rgba(10, 132, 255, 0.24)'
} as const

/** 与 `--lanpm-accent-ring` 对齐 */
export const LANPM_ACCENT_RING_RGBA = {
  light: 'rgba(0, 102, 204, 0.22)',
  dark: 'rgba(10, 132, 255, 0.4)'
} as const

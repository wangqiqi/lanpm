import { useEffect } from 'react'
import { ConfigProvider, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useUiStore } from '@renderer/stores/uiStore'

const APPLE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', sans-serif"

/** 与 global.module.css 一致；Ant Design 无法对 CSS 变量做颜色运算，须用实色 */
const LANPM_PALETTE = {
  light: {
    surfaceSolid: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#86868b',
    separator: 'rgba(60, 60, 67, 0.18)',
    border: 'rgba(60, 60, 67, 0.12)',
    fillSecondary: 'rgba(120, 120, 128, 0.12)'
  },
  dark: {
    surfaceSolid: '#1c1c1e',
    text: '#f5f5f7',
    textSecondary: '#98989d',
    separator: 'rgba(84, 84, 88, 0.65)',
    border: 'rgba(84, 84, 88, 0.36)',
    fillSecondary: 'rgba(120, 120, 128, 0.24)'
  }
} as const

export default function ThemeProvider({
  children
}: {
  children: React.ReactNode
}): React.ReactElement {
  const themeMode = useUiStore((s) => s.theme)
  const locale = useUiStore((s) => s.locale)
  const isDark = themeMode === 'dark'
  const palette = isDark ? LANPM_PALETTE.dark : LANPM_PALETTE.light

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    document.documentElement.style.colorScheme = themeMode
  }, [themeMode])

  useEffect(() => {
    document.documentElement.lang = locale === 'en-US' ? 'en' : 'zh-CN'
  }, [locale])

  return (
    <ConfigProvider
      locale={locale === 'en-US' ? enUS : zhCN}
      theme={{
        algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: {
          fontFamily: APPLE_FONT,
          borderRadius: 10,
          borderRadiusLG: 12,
          colorPrimary: isDark ? '#0a84ff' : '#0071e3',
          colorBgContainer: palette.surfaceSolid,
          colorBgElevated: palette.surfaceSolid,
          colorBorder: palette.separator,
          colorText: palette.text,
          colorTextSecondary: palette.textSecondary,
          colorFillSecondary: palette.fillSecondary,
          controlHeight: 40,
          lineHeight: 1.47059
        },
        components: {
          Button: {
            primaryShadow: 'none',
            defaultShadow: 'none',
            fontWeight: 500
          },
          Input: {
            activeBorderColor: isDark ? '#0a84ff' : '#0071e3',
            hoverBorderColor: palette.separator,
            paddingBlock: 8
          },
          Select: {
            optionSelectedBg: palette.fillSecondary
          },
          Table: {
            headerBg: palette.fillSecondary,
            headerColor: palette.textSecondary,
            borderColor: palette.border
          },
          Tag: {
            defaultBg: palette.fillSecondary,
            defaultColor: palette.textSecondary
          }
        }
      }}
    >
      {children}
    </ConfigProvider>
  )
}

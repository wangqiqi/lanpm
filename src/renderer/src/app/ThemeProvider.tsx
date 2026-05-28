import { useEffect } from 'react'
import { ConfigProvider, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useUiStore } from '@renderer/stores/uiStore'

const APPLE_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', sans-serif"

export default function ThemeProvider({
  children
}: {
  children: React.ReactNode
}): React.ReactElement {
  const themeMode = useUiStore((s) => s.theme)
  const locale = useUiStore((s) => s.locale)
  const isDark = themeMode === 'dark'

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    document.documentElement.style.colorScheme = themeMode
  }, [themeMode])

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
          colorBgContainer: 'var(--lanpm-surface-solid)',
          colorBgElevated: 'var(--lanpm-surface-solid)',
          colorBorder: 'var(--lanpm-separator)',
          colorText: 'var(--lanpm-text)',
          colorTextSecondary: 'var(--lanpm-text-secondary)',
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
            hoverBorderColor: 'var(--lanpm-separator)',
            paddingBlock: 8
          },
          Select: {
            optionSelectedBg: 'var(--lanpm-fill-secondary)'
          }
        }
      }}
    >
      {children}
    </ConfigProvider>
  )
}

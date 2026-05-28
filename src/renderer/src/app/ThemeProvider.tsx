import { useEffect } from 'react'
import { ConfigProvider, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useUiStore } from '@renderer/stores/uiStore'

export default function ThemeProvider({
  children
}: {
  children: React.ReactNode
}): React.ReactElement {
  const themeMode = useUiStore((s) => s.theme)
  const locale = useUiStore((s) => s.locale)

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    document.documentElement.style.colorScheme = themeMode
  }, [themeMode])

  return (
    <ConfigProvider
      locale={locale === 'en-US' ? enUS : zhCN}
      theme={{
        algorithm:
          themeMode === 'dark' ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
        token: { borderRadius: 8 }
      }}
    >
      {children}
    </ConfigProvider>
  )
}

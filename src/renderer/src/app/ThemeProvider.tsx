import { useEffect } from 'react'
import { App as AntdApp, ConfigProvider, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { useUiStore } from '@renderer/stores/uiStore'

/** 与 global.module.css `--lanpm-font-family` 一致（Ant token 须写完整栈，不能用 var） */
const LANPM_FONT_FAMILY =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', sans-serif"

/** 与 global.module.css 一致；Ant Design 无法对 CSS 变量做颜色运算，须用实色 */
/** 与 global.module.css light/dark 气质令牌对齐（Ant 须实色） */
const LANPM_PALETTE = {
  light: {
    surfaceSolid: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#6e6e73',
    separator: 'rgba(60, 60, 67, 0.1)',
    border: 'rgba(60, 60, 67, 0.1)',
    fillSecondary: 'rgba(120, 120, 128, 0.08)',
    selectedBg: 'rgba(0, 102, 204, 0.08)'
  },
  dark: {
    surfaceSolid: '#1c1c1e',
    surfaceElevated: '#2c2c2e',
    text: '#f5f5f7',
    textSecondary: '#a1a1a6',
    separator: 'rgba(84, 84, 88, 0.32)',
    border: 'rgba(84, 84, 88, 0.28)',
    fillSecondary: 'rgba(120, 120, 128, 0.18)',
    selectedBg: 'rgba(10, 132, 255, 0.16)'
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
          fontFamily: LANPM_FONT_FAMILY,
          /* 对齐 --lanpm-radius-md / lg / xl */
          borderRadius: 12,
          borderRadiusLG: 16,
          borderRadiusSM: 8,
          borderRadiusXS: 6,
          colorPrimary: isDark ? '#0a84ff' : '#0071e3',
          colorBgContainer: palette.surfaceSolid,
          colorBgElevated: palette.surfaceElevated,
          colorBorder: palette.separator,
          colorText: palette.text,
          colorTextSecondary: palette.textSecondary,
          colorFillSecondary: palette.fillSecondary,
          colorFillTertiary: isDark
            ? 'rgba(120, 120, 128, 0.18)'
            : 'rgba(120, 120, 128, 0.08)',
          colorFillQuaternary: isDark
            ? 'rgba(120, 120, 128, 0.12)'
            : 'rgba(120, 120, 128, 0.04)',
          controlHeight: 40,
          lineHeight: 1.47059
        },
        components: {
          Button: {
            primaryShadow: 'none',
            defaultShadow: 'none',
            defaultBorderColor: 'transparent',
            defaultBg: 'transparent',
            fontWeight: 500,
            textTextColor: palette.textSecondary,
            textTextHoverColor: palette.text,
            textTextActiveColor: palette.text,
            colorText: palette.textSecondary,
            borderRadius: 12
          },
          Input: {
            activeBorderColor: isDark ? '#0a84ff' : '#0071e3',
            hoverBorderColor: palette.separator,
            paddingBlock: 8,
            borderRadius: 12
          },
          Modal: {
            borderRadiusLG: 16
          },
          Select: {
            optionSelectedBg: palette.selectedBg
          },
          Table: {
            headerBg: palette.fillSecondary,
            headerColor: palette.textSecondary,
            borderColor: palette.border
          },
          Tag: {
            defaultBg: palette.fillSecondary,
            defaultColor: palette.textSecondary,
            borderRadiusSM: 8
          },
          Segmented: {
            trackBg: palette.fillSecondary,
            itemColor: palette.textSecondary,
            itemSelectedBg: palette.surfaceElevated,
            itemSelectedColor: palette.text,
            trackPadding: 3,
            borderRadius: 12,
            borderRadiusSM: 10
          },
          Descriptions: {
            labelBg: palette.fillSecondary,
            titleColor: palette.text
          },
          Tree: {
            nodeSelectedBg: palette.selectedBg
          },
          Menu: {
            itemSelectedBg: palette.selectedBg,
            itemSelectedColor: palette.text
          },
          Radio: {
            buttonBg: palette.fillSecondary,
            buttonCheckedBg: palette.surfaceElevated,
            buttonColor: palette.text
          },
          List: {
            headerBg: palette.fillSecondary,
            footerBg: palette.fillSecondary
          },
          Slider: {
            trackBg: palette.fillSecondary,
            trackHoverBg: palette.fillSecondary
          }
        }
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  )
}

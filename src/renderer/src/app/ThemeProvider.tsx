import { useEffect } from 'react'
import { App as AntdApp, ConfigProvider, theme as antTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import {
  LANPM_ACCENT,
  LANPM_ACCENT_FILL_RGBA,
  LANPM_RADIUS_PX
} from '@shared/design/lanpmDesignTokens'
import { useUiStore } from '@renderer/stores/uiStore'

/** 与 global.module.css `--lanpm-font-family` 一致（Ant token 须写完整栈，不能用 var） */
const LANPM_FONT_FAMILY =
  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', sans-serif"

/** 与 global.module.css light/dark 气质令牌对齐（Ant 须实色 · SSOT `lanpmDesignTokens.ts`） */
const LANPM_PALETTE = {
  light: {
    surfaceSolid: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#1d1d1f',
    textSecondary: '#6e6e73',
    separator: 'rgba(60, 60, 67, 0.1)',
    border: 'rgba(60, 60, 67, 0.1)',
    fillSecondary: 'rgba(120, 120, 128, 0.08)',
    selectedBg: LANPM_ACCENT_FILL_RGBA.light
  },
  dark: {
    surfaceSolid: '#1c1c1e',
    surfaceElevated: '#2c2c2e',
    text: '#f5f5f7',
    textSecondary: '#a1a1a6',
    separator: 'rgba(84, 84, 88, 0.32)',
    border: 'rgba(84, 84, 88, 0.28)',
    fillSecondary: 'rgba(120, 120, 128, 0.18)',
    selectedBg: LANPM_ACCENT_FILL_RGBA.dark
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
  const accent = isDark ? LANPM_ACCENT.dark : LANPM_ACCENT.light

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
          borderRadius: LANPM_RADIUS_PX.md,
          borderRadiusLG: LANPM_RADIUS_PX.lg,
          borderRadiusSM: LANPM_RADIUS_PX.sm,
          borderRadiusXS: LANPM_RADIUS_PX.xs,
          motionDurationFast: '0.15s',
          motionDurationMid: '0.22s',
          motionDurationSlow: '0.28s',
          motionEaseInOut: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          colorPrimary: accent,
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
            borderRadius: LANPM_RADIUS_PX.md
          },
          Input: {
            activeBorderColor: accent,
            hoverBorderColor: palette.separator,
            paddingBlock: 8,
            borderRadius: LANPM_RADIUS_PX.md
          },
          Modal: {
            borderRadiusLG: LANPM_RADIUS_PX.lg
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
            borderRadiusSM: LANPM_RADIUS_PX.sm
          },
          Segmented: {
            trackBg: palette.fillSecondary,
            itemColor: palette.textSecondary,
            itemSelectedBg: palette.surfaceElevated,
            itemSelectedColor: palette.text,
            trackPadding: 3,
            borderRadius: LANPM_RADIUS_PX.md,
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

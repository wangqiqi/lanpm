import { memo, useEffect, useMemo, useState } from 'react'
import { Tag } from 'antd'
import RegionButton from '@renderer/ui/RegionButton'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { CopyOutlined } from '@ant-design/icons'
import githubCssUrl from 'highlight.js/styles/github.css?url'
import githubDarkCssUrl from 'highlight.js/styles/github-dark.css?url'
import type { ThemeMode } from '@renderer/stores/uiStore'
import { highlightCode } from '@renderer/features/chat/highlightSetup'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface CodeBlockProps {
  language: string
  code: string
  theme: ThemeMode
}

const HLJS_THEME_ID = 'lanpm-hljs-theme'
const COLLAPSE_LINE_THRESHOLD = 12

function useHighlightTheme(theme: ThemeMode): void {
  useEffect(() => {
    let link = document.getElementById(HLJS_THEME_ID) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = HLJS_THEME_ID
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = theme === 'dark' ? githubDarkCssUrl : githubCssUrl
  }, [theme])
}

function CodeBlockInner({ language, code, theme }: CodeBlockProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  useHighlightTheme(theme)
  const lineCount = code.split('\n').length
  const collapsible = lineCount > COLLAPSE_LINE_THRESHOLD
  const [expanded, setExpanded] = useState(false)
  const shouldHighlight = !collapsible || expanded
  const html = useMemo(
    () => (shouldHighlight ? highlightCode(code, language) : ''),
    [code, language, shouldHighlight]
  )

  const copyCode = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(code)
      message.success(t('chat.copied'))
    } catch {
      message.error(t('chat.copyCode'))
    }
  }

  return (
    <div className={styles.codeWrap}>
      <div className={styles.codeHeader}>
        <Tag color="default" className={styles.langTag}>
          {language}
        </Tag>
        <RegionButton variant="caption" onClick={() => void copyCode()}>
          <CopyOutlined />
          {t('chat.copyCode')}
        </RegionButton>
        {collapsible && (
          <RegionButton variant="caption" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('chat.codeCollapse') : t('chat.codeExpand')}
          </RegionButton>
        )}
      </div>
      <pre
        className={`hljs ${styles.codeBlock} ${expanded ? styles.codeBlockExpanded : ''}`}
        data-theme={theme}
      >
        {shouldHighlight ? (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  )
}

export default memo(CodeBlockInner)

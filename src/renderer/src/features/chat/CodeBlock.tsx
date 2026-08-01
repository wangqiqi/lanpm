import { memo, useEffect, useState } from 'react'
import { Tag } from 'antd'
import RegionButton from '@renderer/ui/RegionButton'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { CopyOutlined } from '@ant-design/icons'
import githubCssUrl from 'highlight.js/styles/github.css?url'
import githubDarkCssUrl from 'highlight.js/styles/github-dark.css?url'
import type { ThemeMode } from '@renderer/stores/uiStore'
import { highlightCode, highlightCodeAsync } from '@renderer/features/chat/highlightSetup'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface CodeBlockProps {
  language: string
  code: string
  theme: ThemeMode
  deferHeavyContent?: boolean
}

const HLJS_THEME_ID = 'lanpm-hljs-theme'
const COLLAPSE_LINE_THRESHOLD = 12

function useHighlightTheme(theme: ThemeMode, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return
    let link = document.getElementById(HLJS_THEME_ID) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = HLJS_THEME_ID
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = theme === 'dark' ? githubDarkCssUrl : githubCssUrl
  }, [theme, enabled])
}

function CodeBlockInner({
  language,
  code,
  theme,
  deferHeavyContent = false
}: CodeBlockProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const lineCount = code.split('\n').length
  const collapsible = lineCount > COLLAPSE_LINE_THRESHOLD
  const [expanded, setExpanded] = useState(false)
  const shouldHighlight = !deferHeavyContent && (!collapsible || expanded)
  const [html, setHtml] = useState('')
  const [highlightLoading, setHighlightLoading] = useState(false)
  useHighlightTheme(theme, shouldHighlight)

  useEffect(() => {
    if (!shouldHighlight) {
      setHtml('')
      setHighlightLoading(false)
      return
    }
    const controller = new AbortController()
    let cancelled = false
    setHighlightLoading(true)
    void highlightCodeAsync(code, language, controller.signal)
      .then((result) => {
        if (cancelled) return
        setHtml(result)
        setHighlightLoading(false)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (error instanceof DOMException && error.name === 'AbortError') return
        try {
          setHtml(highlightCode(code, language))
        } catch {
          setHtml('')
        }
        setHighlightLoading(false)
      })
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [code, language, shouldHighlight])

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
        {collapsible && !deferHeavyContent ? (
          <RegionButton variant="caption" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('chat.codeCollapse') : t('chat.codeExpand')}
          </RegionButton>
        ) : null}
      </div>
      <pre
        className={`hljs ${styles.codeBlock} ${expanded ? styles.codeBlockExpanded : ''} ${
          highlightLoading ? styles.codeBlockHighlightLoading : ''
        }`}
        data-theme={theme}
        data-deferred={deferHeavyContent ? '1' : undefined}
        data-highlight-loading={highlightLoading ? '1' : undefined}
      >
        {shouldHighlight ? (
          html ? (
            <code dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <code>{code}</code>
          )
        ) : (
          <code>{deferHeavyContent && collapsible ? `… (${lineCount})` : code}</code>
        )}
      </pre>
    </div>
  )
}

export default memo(CodeBlockInner)

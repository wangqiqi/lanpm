import { useEffect, useMemo, useState } from 'react'
import { Button, Tag } from 'antd'
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

export default function CodeBlock({ language, code, theme }: CodeBlockProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  useHighlightTheme(theme)
  const [expanded, setExpanded] = useState(false)
  const html = useMemo(() => highlightCode(code, language), [code, language])

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
        <Button
          type="text"
          size="small"
          icon={<CopyOutlined />}
          aria-label={t('chat.copyCode')}
          onClick={() => void copyCode()}
        >
          {t('chat.copyCode')}
        </Button>
        {code.split('\n').length > 12 && (
          <Button type="link" size="small" onClick={() => setExpanded((v) => !v)}>
            {expanded ? t('chat.codeCollapse') : t('chat.codeExpand')}
          </Button>
        )}
      </div>
      <pre
        className={`hljs ${styles.codeBlock} ${expanded ? styles.codeBlockExpanded : ''}`}
        data-theme={theme}
      >
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

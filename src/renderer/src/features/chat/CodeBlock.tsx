import { useEffect, useMemo, useState } from 'react'
import { Button, Tag } from 'antd'
import type { ThemeMode } from '@renderer/stores/uiStore'
import { highlightCode } from '@renderer/features/chat/highlightSetup'
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
    void import(
      theme === 'dark'
        ? 'highlight.js/styles/github-dark.css'
        : 'highlight.js/styles/github.css'
    ).then((mod) => {
      link!.href = mod.default
    })
  }, [theme])
}

export default function CodeBlock({ language, code, theme }: CodeBlockProps): React.ReactElement {
  useHighlightTheme(theme)
  const [expanded, setExpanded] = useState(false)
  const html = useMemo(() => highlightCode(code, language), [code, language])

  return (
    <div className={styles.codeWrap}>
      <div className={styles.codeHeader}>
        <Tag className={styles.langTag}>{language}</Tag>
        {code.split('\n').length > 12 && (
          <Button type="link" size="small" onClick={() => setExpanded((v) => !v)}>
            {expanded ? '收起' : '展开'}
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

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import CodeBlock from '@renderer/features/chat/CodeBlock'
import { useUiStore } from '@renderer/stores/uiStore'
import styles from './markdownContent.module.css'

interface MarkdownViewProps {
  content: string
  /** 行内片段（气泡内混排）vs 块级（整段 MD） */
  variant?: 'inline' | 'block'
  className?: string
}

export default function MarkdownView({
  content,
  variant = 'block',
  className
}: MarkdownViewProps): React.ReactElement {
  const theme = useUiStore((s) => s.theme)

  const body = useMemo(
    () => (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children }) {
            return <>{children}</>
          },
          p({ children }) {
            if (variant === 'inline') {
              return <span className={styles.markdownInlineP}>{children}</span>
            }
            return <p>{children}</p>
          },
          code(props) {
            const { children, className: codeClass, ...rest } = props
            const text = String(children).replace(/\n$/, '')
            const match = /language-([\w-]+)/.exec(codeClass ?? '')
            if (match) {
              return <CodeBlock language={match[1] ?? 'text'} code={text} theme={theme} />
            }
            return (
              <code className={styles.inlineCode} {...rest}>
                {children}
              </code>
            )
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                className={styles.markdownLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          }
        }}
      >
        {content}
      </ReactMarkdown>
    ),
    [content, theme, variant]
  )

  return <div className={`${styles.markdownRoot} ${className ?? ''}`.trim()}>{body}</div>
}

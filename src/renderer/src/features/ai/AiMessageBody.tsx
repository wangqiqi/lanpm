import MarkdownView from '@renderer/ui/MarkdownView'
import styles from './aiAssistant.module.css'

interface AiMessageBodyProps {
  content: string
  /** 用户消息保持纯文本；助手消息渲染 Markdown */
  markdown?: boolean
}

export default function AiMessageBody({
  content,
  markdown = false
}: AiMessageBodyProps): React.ReactElement {
  if (markdown) {
    return (
      <div className={styles.msgBody}>
        <MarkdownView content={content} variant="block" />
      </div>
    )
  }

  return <div className={`${styles.msgBody} ${styles.msgBodyPlain}`}>{content}</div>
}

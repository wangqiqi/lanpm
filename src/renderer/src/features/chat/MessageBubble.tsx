import type { ChatMessage } from '@shared/chat/types'
import { useUiStore } from '@renderer/stores/uiStore'
import CodeBlock from '@renderer/features/chat/CodeBlock'
import styles from './chat.module.css'

interface MessageBubbleProps {
  message: ChatMessage
  own: boolean
  deliveryLabel: string
  formatTime: (iso: string) => string
}

export default function MessageBubble({
  message,
  own,
  deliveryLabel,
  formatTime
}: MessageBubbleProps): React.ReactElement {
  const theme = useUiStore((s) => s.theme)
  const isCode = message.content.kind === 'code'

  return (
    <div
      className={`${styles.bubble} ${isCode ? styles.codeBubble : own ? styles.bubbleOwn : styles.bubbleOther}`}
      data-own={own ? '1' : '0'}
    >
      {!own && (
        <div className={styles.meta}>
          {message.senderUserId} · {formatTime(message.createdAt)}
        </div>
      )}

      {message.content.kind === 'text' && <div>{message.content.text}</div>}

      {message.content.kind === 'code' && (
        <CodeBlock
          language={message.content.language}
          code={message.content.code}
          theme={message.content.theme ?? theme}
        />
      )}

      {message.content.kind !== 'text' && message.content.kind !== 'code' && (
        <div>[{message.type}]</div>
      )}

      {own && (
        <div className={styles.status}>
          {formatTime(message.createdAt)} {deliveryLabel}
        </div>
      )}
    </div>
  )
}

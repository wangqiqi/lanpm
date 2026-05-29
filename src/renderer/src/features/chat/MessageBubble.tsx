import { Button } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { groupViewPath } from '@renderer/routes/paths'
import { useUiStore } from '@renderer/stores/uiStore'
import { useI18n } from '@renderer/i18n/useI18n'
import CodeBlock from '@renderer/features/chat/CodeBlock'
import MentionText from '@renderer/features/chat/MentionText'
import styles from './chat.module.css'

interface MessageBubbleProps {
  message: ChatMessage
  own: boolean
  members: GroupMemberView[]
  deliveryLabel: string
  formatTime: (iso: string) => string
  highlighted?: boolean
}

export default function MessageBubble({
  message,
  own,
  members,
  deliveryLabel,
  formatTime,
  highlighted = false
}: MessageBubbleProps): React.ReactElement {
  const { t } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const isCode = message.content.kind === 'code'
  const senderName =
    members.find((m) => m.userId === message.senderUserId)?.displayName ?? message.senderUserId

  return (
    <div
      className={`${styles.bubble} ${isCode ? styles.codeBubble : own ? styles.bubbleOwn : styles.bubbleOther} ${highlighted ? styles.searchHighlight : ''}`}
      data-own={own ? '1' : '0'}
      data-msg-id={message.msgId}
    >
      {!own && (
        <div className={styles.meta}>
          {senderName} · {formatTime(message.createdAt)}
        </div>
      )}

      {message.content.kind === 'text' && (
        <div>
          <MentionText text={message.content.text} members={members} own={own} />
        </div>
      )}

      {message.content.kind === 'code' && (
        <CodeBlock
          language={message.content.language}
          code={message.content.code}
          theme={message.content.theme ?? theme}
        />
      )}

      {message.content.kind === 'task_ref' && groupId && (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: 'auto' }}
          onClick={() => navigate(groupViewPath(groupId, 'board'))}
        >
          {t('chat.taskRef', { title: message.content.title })}
        </Button>
      )}

      {message.content.kind !== 'text' &&
        message.content.kind !== 'code' &&
        message.content.kind !== 'task_ref' && (
          <div>{t('chat.unknownMessage', { type: message.type })}</div>
        )}

      {own && (
        <div className={styles.status}>
          {formatTime(message.createdAt)} {deliveryLabel}
        </div>
      )}
    </div>
  )
}

import { Button } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { groupViewPath } from '@renderer/routes/paths'
import { useUiStore } from '@renderer/stores/uiStore'
import CodeBlock from '@renderer/features/chat/CodeBlock'
import MentionText from '@renderer/features/chat/MentionText'
import styles from './chat.module.css'

interface MessageBubbleProps {
  message: ChatMessage
  own: boolean
  members: GroupMemberView[]
  deliveryLabel: string
  formatTime: (iso: string) => string
}

export default function MessageBubble({
  message,
  own,
  members,
  deliveryLabel,
  formatTime
}: MessageBubbleProps): React.ReactElement {
  const theme = useUiStore((s) => s.theme)
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
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
          📋 任务：{message.content.title}
        </Button>
      )}

      {message.content.kind !== 'text' &&
        message.content.kind !== 'code' &&
        message.content.kind !== 'task_ref' && <div>[{message.type}]</div>}

      {own && (
        <div className={styles.status}>
          {formatTime(message.createdAt)} {deliveryLabel}
        </div>
      )}
    </div>
  )
}

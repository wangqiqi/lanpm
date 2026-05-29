import { useMemo } from 'react'
import { Avatar, Dropdown, type MenuProps } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { groupViewPath } from '@renderer/routes/paths'
import { useUiStore } from '@renderer/stores/uiStore'
import { useI18n } from '@renderer/i18n/useI18n'
import CodeBlock from '@renderer/features/chat/CodeBlock'
import MentionText from '@renderer/features/chat/MentionText'
import styles from './chat.module.css'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function avatarLabel(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 1).toUpperCase()
}

interface MessageBubbleProps {
  message: ChatMessage
  own: boolean
  members: GroupMemberView[]
  deliveryLabel: string
  deliveryAriaLabel: string
  formatTime: (iso: string) => string
  highlighted?: boolean
  showSender?: boolean
  dmAllowed?: boolean
  onMentionSender?: (displayName: string) => void
  onViewSender?: (member: GroupMemberView) => void
  onDmSender?: (member: GroupMemberView) => void
}

export default function MessageBubble({
  message,
  own,
  members,
  deliveryLabel,
  deliveryAriaLabel,
  formatTime,
  highlighted = false,
  showSender = true,
  dmAllowed = false,
  onMentionSender,
  onViewSender,
  onDmSender
}: MessageBubbleProps): React.ReactElement {
  const { t } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const isCode = message.content.kind === 'code'

  const sender = useMemo(
    () => members.find((m) => m.userId === message.senderUserId),
    [members, message.senderUserId]
  )
  const senderName = sender?.displayName ?? message.senderUserId
  const senderMember: GroupMemberView = sender ?? {
    userId: message.senderUserId,
    displayName: senderName
  }

  const senderMenu: MenuProps = useMemo(() => {
    if (own) return { items: [] }
    const items: MenuProps['items'] = [
      {
        key: 'mention',
        label: t('chat.mentionMember', { name: senderName }),
        onClick: () => onMentionSender?.(senderName)
      },
      {
        key: 'profile',
        label: t('chat.viewMemberProfile'),
        onClick: () => onViewSender?.(senderMember)
      }
    ]
    if (dmAllowed && onDmSender) {
      items.push({
        key: 'dm',
        label: t('chat.startDm'),
        onClick: () => onDmSender(senderMember)
      })
    }
    return { items }
  }, [own, senderName, senderMember, dmAllowed, onDmSender, onMentionSender, onViewSender, t])

  const bubbleBody = (
    <>
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

      {message.content.kind === 'file' && groupId && (
        <button
          type="button"
          className={styles.bubbleAttachLink}
          onClick={() => {
            if (message.content.kind !== 'file') return
            navigate(groupViewPath(groupId, 'files'), {
              state: { selectFileId: message.content.fileId }
            })
          }}
        >
          {t('chat.fileMessage', {
            name: message.content.fileName,
            size: formatFileSize(message.content.size)
          })}
        </button>
      )}

      {message.content.kind === 'task_ref' && groupId && (
        <button
          type="button"
          className={styles.bubbleAttachLink}
          onClick={() => navigate(groupViewPath(groupId, 'board'))}
        >
          {t('chat.taskRef', { title: message.content.title })}
        </button>
      )}

      {message.content.kind !== 'text' &&
        message.content.kind !== 'code' &&
        message.content.kind !== 'task_ref' &&
        message.content.kind !== 'file' && (
          <div>{t('chat.unknownMessage', { type: message.type })}</div>
        )}
    </>
  )

  const bubbleClass = `${styles.bubble} ${isCode ? styles.codeBubble : own ? styles.bubbleOwn : styles.bubbleOther} ${highlighted ? styles.searchHighlight : ''}`

  if (own) {
    return (
      <div className={styles.messageRowOwn} data-own="1" data-msg-id={message.msgId}>
        <div className={styles.messageColOwn}>
          <div className={bubbleClass}>{bubbleBody}</div>
          <div className={styles.status}>
            {formatTime(message.createdAt)}{' '}
            <span aria-label={deliveryAriaLabel} title={deliveryAriaLabel}>
              {deliveryLabel}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.messageRow} ${showSender ? styles.messageRowNewSender : styles.messageRowCompact}`}
      data-own="0"
      data-msg-id={message.msgId}
    >
      <div className={styles.senderCol}>
        {showSender ? (
          <Dropdown menu={senderMenu} trigger={['contextMenu']}>
            <button
              type="button"
              className={styles.avatarBtn}
              aria-label={t('chat.viewMemberProfile')}
              onClick={() => onViewSender?.(senderMember)}
            >
              <Avatar size={36} icon={<UserOutlined />}>
                {avatarLabel(senderName)}
              </Avatar>
            </button>
          </Dropdown>
        ) : (
          <div className={styles.avatarSpacer} aria-hidden />
        )}
      </div>
      <div className={`${styles.messageCol} ${isCode ? styles.messageColWide : ''}`}>
        {showSender ? (
          <Dropdown menu={senderMenu} trigger={['contextMenu']}>
            <div className={styles.messageHeader}>
              <button
                type="button"
                className={styles.senderNameBtn}
                onClick={() => onViewSender?.(senderMember)}
              >
                {senderName}
              </button>
              <span className={styles.messageTime}>{formatTime(message.createdAt)}</span>
            </div>
          </Dropdown>
        ) : null}
        <div className={bubbleClass}>{bubbleBody}</div>
      </div>
    </div>
  )
}

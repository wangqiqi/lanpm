import { useMemo } from 'react'
import { Avatar, Dropdown, type MenuProps } from 'antd'
import { UserOutlined, FileOutlined, ProjectOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { canRecallMessage } from '@shared/chat/recall'
import { groupViewPath } from '@renderer/routes/paths'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
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
  onRecall?: (msgId: string) => void
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
  onDmSender,
  onRecall
}: MessageBubbleProps): React.ReactElement {
  const { t } = useI18n()
  const theme = useUiStore((s) => s.theme)
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const isRecalled = message.content.kind === 'recalled'
  const isCode = message.content.kind === 'code'
  const isSystem =
    !isRecalled && (message.type === 'system' || message.content.kind === 'system')

  const sender = useMemo(
    () => members.find((m) => m.userId === message.senderUserId),
    [members, message.senderUserId]
  )
  const senderName = resolveMemberDisplayName(
    sender?.displayName ?? message.senderUserId,
    t
  )
  const senderMember: GroupMemberView = sender ?? {
    userId: message.senderUserId,
    displayName: senderName
  }

  const recallActorName = useMemo(() => {
    if (message.content.kind !== 'recalled') return ''
    const { recalledBy } = message.content
    if (recalledBy === currentUserId) return t('chat.recalledYou')
    const actor = members.find((m) => m.userId === recalledBy)
    return actor
      ? resolveMemberDisplayName(actor.displayName, t)
      : recalledBy
  }, [message.content, members, currentUserId, t])

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

  const ownMenu: MenuProps = useMemo(() => {
    if (!own || !currentUserId || !onRecall || !canRecallMessage(message, currentUserId)) {
      return { items: [] }
    }
    return {
      items: [
        {
          key: 'recall',
          label: t('chat.recallMessage'),
          onClick: () => onRecall(message.msgId)
        }
      ]
    }
  }, [own, currentUserId, onRecall, message, t])

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
          className={styles.bubbleAttachCard}
          aria-label={t('chat.openInFiles')}
          onClick={() => {
            if (message.content.kind !== 'file') return
            navigate(groupViewPath(groupId, 'files'), {
              state: { selectFileId: message.content.fileId }
            })
          }}
        >
          <div className={styles.attachIcon}>
            <FileOutlined />
          </div>
          <div className={styles.attachInfo}>
            <span className={styles.attachTitle}>{message.content.fileName}</span>
            <span className={styles.attachMeta}>
              {formatFileSize(message.content.size)} • {t('chat.openInFiles')}
            </span>
          </div>
        </button>
      )}

      {message.content.kind === 'task_ref' && groupId && (
        <button
          type="button"
          className={styles.bubbleAttachCard}
          onClick={() => navigate(groupViewPath(groupId, 'board'))}
        >
          <div className={styles.attachIcon}>
            <ProjectOutlined />
          </div>
          <div className={styles.attachInfo}>
            <span className={styles.attachTitle}>{message.content.title}</span>
            <span className={styles.attachMeta}>{t('chat.viewTask')}</span>
          </div>
        </button>
      )}

      {message.content.kind !== 'text' &&
        message.content.kind !== 'code' &&
        message.content.kind !== 'task_ref' &&
        message.content.kind !== 'file' &&
        message.content.kind !== 'recalled' && (
          <div>{t('chat.unknownMessage', { type: message.type })}</div>
        )}
    </>
  )

  const bubbleClass = `${styles.bubble} ${isCode ? styles.codeBubble : own ? styles.bubbleOwn : styles.bubbleOther} ${highlighted ? styles.searchHighlight : ''}`

  if (isRecalled) {
    return (
      <div className={styles.systemMessageRow} data-msg-id={message.msgId}>
        <span className={styles.systemMessageText}>
          {t('chat.recalledMessage', { name: recallActorName })}
        </span>
      </div>
    )
  }

  if (isSystem) {
    const event =
      message.content.kind === 'system' ? message.content.event : message.type
    return (
      <div className={styles.systemMessageRow} data-msg-id={message.msgId}>
        <span className={styles.systemMessageText}>{t('chat.systemMessage', { event })}</span>
      </div>
    )
  }

  if (own) {
    return (
      <div className={styles.messageRowOwn} data-own="1" data-msg-id={message.msgId}>
        <div className={styles.messageColOwn}>
          <Dropdown menu={ownMenu} trigger={['contextMenu']}>
            <div className={bubbleClass}>{bubbleBody}</div>
          </Dropdown>
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

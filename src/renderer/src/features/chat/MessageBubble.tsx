import { useMemo } from 'react'
import { Dropdown, Tag, type MenuProps } from 'antd'
import UserAvatar from '@renderer/ui/UserAvatar'
import { FileOutlined, ProjectOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import type { Task } from '@shared/task/types'
import {
  buildMessageContextMenuActions,
  getMessageCopyCodeText,
  getMessageCopyPayload,
  type MessageContextMenuActionId
} from '@shared/chat/messageContextMenu'
import { groupViewPath } from '@renderer/routes/paths'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { resolveMemberDisplayName } from '@renderer/i18n/memberDisplay'
import { useI18n } from '@renderer/i18n/useI18n'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import CodeBlock from '@renderer/features/chat/CodeBlock'
import ChatMessageText from '@renderer/features/chat/ChatMessageText'
import { copyTextToClipboard } from '@renderer/features/chat/messageContextActions'
import { useLocateTask } from '@renderer/features/task/useLocateTask'
import { PluginZoneHost } from '@renderer/plugin/PluginSlot'
import { usePluginMenus } from '@renderer/plugin/usePluginMenus'
import MessageReplyStrip from '@renderer/features/chat/MessageReplyStrip'
import type { ResolvedReplyQuote } from '@shared/chat/replyQuote'
import styles from './chat.module.css'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface MessageBubbleProps {
  message: ChatMessage
  own: boolean
  members: GroupMemberView[]
  tasks?: Task[]
  deliveryLabel: string
  deliveryAriaLabel: string
  deliveryFailed?: boolean
  formatTime: (iso: string) => string
  highlighted?: boolean
  showSender?: boolean
  dmAllowed?: boolean
  onMentionSender?: (displayName: string) => void
  onViewSender?: (member: GroupMemberView) => void
  onDmSender?: (member: GroupMemberView) => void
  onRecall?: (msgId: string) => void
  onRetrySend?: (msgId: string) => void
  /** Project group only — one-click create task from this message */
  taskCreateAllowed?: boolean
  onCreateTaskFromMessage?: (message: ChatMessage) => void
  onLinkFileToTask?: (fileId: string, fileName: string) => void
  onLinkMessageToTask?: (message: ChatMessage) => void
  replyQuote?: ResolvedReplyQuote | null
  onJumpToReply?: (msgId: string) => void
  isPinned?: boolean
  multiSelectMode?: boolean
  selected?: boolean
  onToggleSelect?: (msgId: string) => void
  jumpHighlighted?: boolean
  onReply?: (message: ChatMessage) => void
  onForward?: (message: ChatMessage) => void
  onPin?: (msgId: string) => void
  onUnpin?: (msgId: string) => void
  onEdit?: (message: ChatMessage) => void
  onHide?: (msgId: string) => void
  onEnterMultiSelect?: (msgId: string) => void
}

export default function MessageBubble({
  message,
  own,
  members,
  tasks = [],
  deliveryLabel,
  deliveryAriaLabel,
  deliveryFailed = false,
  formatTime,
  highlighted = false,
  showSender = true,
  dmAllowed = false,
  onMentionSender,
  onViewSender,
  onDmSender,
  onRecall,
  onRetrySend,
  taskCreateAllowed = false,
  onCreateTaskFromMessage,
  onLinkFileToTask,
  onLinkMessageToTask,
  replyQuote = null,
  onJumpToReply,
  isPinned = false,
  multiSelectMode = false,
  selected = false,
  onToggleSelect,
  jumpHighlighted = false,
  onReply,
  onForward,
  onPin,
  onUnpin,
  onEdit,
  onHide,
  onEnterMultiSelect
}: MessageBubbleProps): React.ReactElement {
  const { t } = useI18n()
  const { message: appMessage } = useLanpmApp()
  const theme = useUiStore((s) => s.theme)
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const navigate = useNavigate()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const locateTask = useLocateTask(gid)
  const messageContext = {
    groupId: gid,
    view: 'chat' as const,
    selection: { messageId: message.msgId }
  }
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

  const pluginContextMenuItems = usePluginMenus('chat.message.context')

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

  const bubbleMenu: MenuProps = useMemo(() => {
    const coreActions = buildMessageContextMenuActions({
      message,
      own,
      currentUserId,
      taskCreateAllowed,
      showMention: !own && Boolean(onMentionSender),
      isPinned,
      multiSelectActive: multiSelectMode
    })

    const labelFor = (id: MessageContextMenuActionId): string => {
      switch (id) {
        case 'copy':
          return t('chat.copyMessage')
        case 'copyCode':
          return t('chat.copyCode')
        case 'openTask':
          return t('chat.openTask')
        case 'openFile':
          return t('chat.openInFiles')
        case 'reply':
          return t('chat.replyMessage')
        case 'forward':
          return t('chat.forwardMessage')
        case 'pin':
          return t('chat.pinMessage')
        case 'unpin':
          return t('chat.unpinMessage')
        case 'createTask':
          return t('chat.createTaskFromMessage')
        case 'linkExistingTask':
          return t('chat.linkMessageToTask')
        case 'linkFile':
          return t('chat.linkFileToTask')
        case 'edit':
          return t('chat.editMessage')
        case 'hide':
          return t('chat.hideMessage')
        case 'enterMultiSelect':
          return t('chat.enterMultiSelect')
        case 'mention':
          return t('chat.mentionMember', { name: senderName })
        case 'recall':
          return t('chat.recallMessage')
        default:
          return id
      }
    }

    const onAction = (id: MessageContextMenuActionId): void => {
      switch (id) {
        case 'copy': {
          const payload = getMessageCopyPayload(message)
          if (!payload) return
          void copyTextToClipboard(payload.text).then((ok) => {
            if (ok) appMessage.success(t('chat.copyMessageDone'))
            else appMessage.error(t('chat.copyMessageFailed'))
          })
          break
        }
        case 'copyCode': {
          const code = getMessageCopyCodeText(message)
          if (!code) return
          void copyTextToClipboard(code).then((ok) => {
            if (ok) appMessage.success(t('chat.copyCodeDone'))
            else appMessage.error(t('chat.copyMessageFailed'))
          })
          break
        }
        case 'openTask':
          if (message.content.kind === 'task_ref') {
            locateTask(message.content.taskId, 'board')
          }
          break
        case 'openFile':
          if (message.content.kind === 'file' && groupId) {
            navigate(groupViewPath(groupId, 'files'), {
              state: { selectFileId: message.content.fileId }
            })
          }
          break
        case 'reply':
          onReply?.(message)
          break
        case 'forward':
          onForward?.(message)
          break
        case 'pin':
          onPin?.(message.msgId)
          break
        case 'unpin':
          onUnpin?.(message.msgId)
          break
        case 'createTask':
          onCreateTaskFromMessage?.(message)
          break
        case 'linkExistingTask':
          onLinkMessageToTask?.(message)
          break
        case 'linkFile':
          if (message.content.kind === 'file') {
            onLinkFileToTask?.(message.content.fileId, message.content.fileName)
          }
          break
        case 'edit':
          onEdit?.(message)
          break
        case 'hide':
          onHide?.(message.msgId)
          break
        case 'enterMultiSelect':
          onEnterMultiSelect?.(message.msgId)
          break
        case 'mention':
          onMentionSender?.(senderName)
          break
        case 'recall':
          onRecall?.(message.msgId)
          break
        default:
          break
      }
    }

    const items: MenuProps['items'] = coreActions.map((action) => ({
      key: action.id,
      label: labelFor(action.id),
      onClick: () => onAction(action.id)
    }))

    if (pluginContextMenuItems?.length) {
      items.push(...pluginContextMenuItems)
    }

    return { items }
  }, [
    message,
    own,
    currentUserId,
    taskCreateAllowed,
    onMentionSender,
    senderName,
    t,
    appMessage,
    locateTask,
    groupId,
    navigate,
    onCreateTaskFromMessage,
    onLinkMessageToTask,
    onLinkFileToTask,
    onRecall,
    onReply,
    onForward,
    onPin,
    onUnpin,
    onEdit,
    onHide,
    onEnterMultiSelect,
    isPinned,
    multiSelectMode,
    pluginContextMenuItems
  ])

  const hasBubbleMenu = (bubbleMenu.items?.length ?? 0) > 0

  const selectCheckbox =
    multiSelectMode && onToggleSelect ? (
      <input
        type="checkbox"
        className={styles.multiSelectCheckbox}
        checked={selected}
        aria-label={t('chat.selectMessage')}
        onChange={() => onToggleSelect(message.msgId)}
        onClick={(e) => e.stopPropagation()}
      />
    ) : null

  const bubbleBody = (
    <>
      {replyQuote ? (
        <MessageReplyStrip quote={replyQuote} onJump={onJumpToReply} />
      ) : null}
      {message.content.kind === 'text' && message.content.meta?.forwardedFrom ? (
        <span className={styles.forwardedLabel}>{t('chat.forwardedMessage')}</span>
      ) : null}
      {message.content.kind === 'text' && (
        <div>
          {message.content.meta?.source === 'ai-assistant' ? (
            <Tag className={styles.aiSourceTag} color="blue">
              {t('ai.fromAssistant')}
            </Tag>
          ) : null}
          <ChatMessageText
            text={message.content.text}
            members={members}
            tasks={tasks}
            own={own}
            meta={message.content.meta}
            onTaskRefClick={groupId ? (taskId) => locateTask(taskId, 'board') : undefined}
          />
          {message.content.meta?.editedAt ? (
            <span className={styles.editedLabel}>{t('chat.editedLabel')}</span>
          ) : null}
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
          aria-label={t('chat.viewTask')}
          onClick={() => {
            if (message.content.kind !== 'task_ref') return
            locateTask(message.content.taskId, 'board')
          }}
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

  const bubbleClass = `${styles.bubble} ${isCode ? styles.codeBubble : own ? styles.bubbleOwn : styles.bubbleOther} ${highlighted || jumpHighlighted ? styles.searchHighlight : ''} ${jumpHighlighted ? styles.messageRowHighlight : ''}`

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
      <div
        className={styles.messageRowOwn}
        data-own="1"
        data-msg-id={message.msgId}
        onClick={multiSelectMode ? () => onToggleSelect?.(message.msgId) : undefined}
      >
        {selectCheckbox}
        <div className={styles.messageColOwn}>
          {hasBubbleMenu ? (
            <Dropdown menu={bubbleMenu} trigger={['contextMenu']}>
              <div className={bubbleClass}>{bubbleBody}</div>
            </Dropdown>
          ) : (
            <div className={bubbleClass}>{bubbleBody}</div>
          )}
          <div className={styles.status}>
            {formatTime(message.createdAt)}{' '}
            <span
              className={deliveryFailed ? styles.deliveryFailed : undefined}
              aria-label={deliveryAriaLabel}
              title={deliveryAriaLabel}
            >
              {deliveryLabel}
            </span>
            {deliveryFailed && onRetrySend ? (
              <button
                type="button"
                className={styles.retrySendBtn}
                onClick={() => onRetrySend(message.msgId)}
              >
                {t('chat.retrySend')}
              </button>
            ) : null}
          </div>
          <PluginZoneHost zone="context" context={messageContext} />
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${styles.messageRow} ${showSender ? styles.messageRowNewSender : styles.messageRowCompact}`}
      data-own="0"
      data-msg-id={message.msgId}
      onClick={multiSelectMode ? () => onToggleSelect?.(message.msgId) : undefined}
    >
      {selectCheckbox}
      <div className={styles.senderCol}>
        {showSender ? (
          <Dropdown menu={senderMenu} trigger={['contextMenu']}>
            <button
              type="button"
              className={styles.avatarBtn}
              aria-label={t('chat.viewMemberProfile')}
              onClick={() => onViewSender?.(senderMember)}
            >
              <UserAvatar
                size={36}
                displayName={senderName}
                userId={senderMember.userId}
                avatarUrl={senderMember.avatarUrl}
              />
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
        {hasBubbleMenu ? (
          <Dropdown menu={bubbleMenu} trigger={['contextMenu']}>
            <div className={bubbleClass}>{bubbleBody}</div>
          </Dropdown>
        ) : (
          <div className={bubbleClass}>{bubbleBody}</div>
        )}
        <PluginZoneHost zone="context" context={messageContext} />
      </div>
    </div>
  )
}

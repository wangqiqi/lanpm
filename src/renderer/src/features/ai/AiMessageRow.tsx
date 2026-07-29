import { Checkbox } from 'antd'
import { CopyOutlined, RobotOutlined } from '@ant-design/icons'
import type { AiMessage } from '@shared/ai/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { useIdentityStore } from '@renderer/stores/identityStore'
import UserAvatar from '@renderer/ui/UserAvatar'
import { formatAiMessageTime } from '@renderer/features/ai/formatAiMessageTime'
import styles from './aiAssistant.module.css'

export interface AiMessageRowProps {
  message: Pick<AiMessage, 'messageId' | 'role' | 'content' | 'createdAt'>
  showAvatar: boolean
  selectMode: boolean
  selected: boolean
  onToggleSelect: (messageId: string) => void
  onCopy: (content: string) => void
}

export default function AiMessageRow({
  message,
  showAvatar,
  selectMode,
  selected,
  onToggleSelect,
  onCopy
}: AiMessageRowProps): React.ReactElement {
  const { t } = useI18n()
  const user = useIdentityStore((s) => s.user)
  const isUser = message.role === 'user'
  const timeLabel = formatAiMessageTime(message.createdAt)

  const avatarCol = isUser ? (
    <div className={styles.msgAvatarCol}>
      {showAvatar ? (
        <UserAvatar
          size={32}
          displayName={user?.displayName ?? t('ai.you')}
          userId={user?.userId}
          avatarUrl={user?.avatarUrl}
        />
      ) : (
        <div className={styles.msgAvatarSpacer} aria-hidden />
      )}
    </div>
  ) : (
    <div className={styles.msgAvatarCol}>
      {showAvatar ? (
        <div className={styles.aiAvatar} aria-hidden>
          <RobotOutlined />
        </div>
      ) : (
        <div className={styles.msgAvatarSpacer} aria-hidden />
      )}
    </div>
  )

  const meta = (
    <div className={styles.msgMeta}>
      <span className={styles.msgSender}>
        {isUser ? (user?.displayName ?? t('ai.you')) : t('ai.assistantName')}
      </span>
      {timeLabel ? <span className={styles.msgTime}>{timeLabel}</span> : null}
      {!selectMode ? (
        <button
          type="button"
          className={styles.msgCopyBtn}
          aria-label={t('ai.copyMessage')}
          title={t('ai.copyMessage')}
          onClick={() => onCopy(message.content)}
        >
          <CopyOutlined />
        </button>
      ) : null}
    </div>
  )

  const bubble = (
    <div className={isUser ? styles.msgBubbleUser : styles.msgBubbleAssistant}>
      <div className={styles.msgBody}>{message.content}</div>
    </div>
  )

  if (isUser) {
    return (
      <div
        className={`${styles.msgRow} ${styles.msgRowUser} ${showAvatar ? styles.msgRowNewBlock : styles.msgRowCompact}`}
        data-msg-id={message.messageId}
      >
        {selectMode ? (
          <Checkbox
            className={styles.msgSelectBox}
            checked={selected}
            onChange={() => onToggleSelect(message.messageId)}
            aria-label={t('ai.selectMessage')}
          />
        ) : null}
        <div className={styles.msgMainUser}>
          {showAvatar ? meta : <div className={styles.msgMetaCompact}>{timeLabel}</div>}
          {bubble}
          {!showAvatar ? (
            <div className={styles.msgMetaFooter}>
              {timeLabel}
              {!selectMode ? (
                <button
                  type="button"
                  className={styles.msgCopyBtn}
                  aria-label={t('ai.copyMessage')}
                  onClick={() => onCopy(message.content)}
                >
                  <CopyOutlined />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {avatarCol}
      </div>
    )
  }

  return (
    <div
      className={`${styles.msgRow} ${styles.msgRowAssistant} ${showAvatar ? styles.msgRowNewBlock : styles.msgRowCompact}`}
      data-msg-id={message.messageId}
    >
      {selectMode ? (
        <Checkbox
          className={styles.msgSelectBox}
          checked={selected}
          onChange={() => onToggleSelect(message.messageId)}
          aria-label={t('ai.selectMessage')}
        />
      ) : null}
      {avatarCol}
      <div className={styles.msgMainAssistant}>
        {showAvatar ? meta : null}
        {bubble}
        <div className={styles.msgMetaFooter}>
          {!showAvatar ? timeLabel : null}
          {!selectMode ? (
            <button
              type="button"
              className={styles.msgCopyBtn}
              aria-label={t('ai.copyMessage')}
              onClick={() => onCopy(message.content)}
            >
              <CopyOutlined />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

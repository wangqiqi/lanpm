import { memo } from 'react'
import type { GroupMemberView } from '@shared/chat/members'
import type { Task } from '@shared/task/types'
import { shouldRenderChatMarkdown } from '@shared/chat/markdownDetect'
import { splitMentionSegments } from '@shared/chat/mentions'
import { splitTaskRefSegments } from '@shared/chat/taskRefs'
import MarkdownView from '@renderer/ui/MarkdownView'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface ChatMessageTextProps {
  text: string
  members: GroupMemberView[]
  tasks?: Task[]
  own?: boolean
  meta?: { source?: string }
  msgId?: string
  onTaskRefClick?: (taskId: string) => void
}

function renderTaskRefSegment(
  tSeg: ReturnType<typeof splitTaskRefSegments>[number],
  key: string,
  own: boolean | undefined,
  onTaskRefClick: ((taskId: string) => void) | undefined,
  t: (key: 'chat.viewTask') => string,
  msgId?: string
): React.ReactElement {
  if (tSeg.kind === 'taskRef') {
    if (tSeg.taskId && onTaskRefClick) {
      return (
        <button
          key={key}
          type="button"
          className={`${own ? styles.taskRefOwn : styles.taskRef} ${styles.taskRefLink}`}
          title={tSeg.taskId}
          aria-label={t('chat.viewTask')}
          onClick={() => onTaskRefClick(tSeg.taskId!)}
        >
          {tSeg.value}
        </button>
      )
    }
    return (
      <span
        key={key}
        className={own ? styles.taskRefOwn : styles.taskRef}
        title={tSeg.taskId}
      >
        {tSeg.value}
      </span>
    )
  }

  if (shouldRenderChatMarkdown(tSeg.value)) {
    return (
      <MarkdownView key={key} content={tSeg.value} variant="inline" cacheKey={msgId} />
    )
  }

  return <span key={key}>{tSeg.value}</span>
}

function renderTextWithTaskRefs(
  text: string,
  tasks: Task[],
  own: boolean | undefined,
  onTaskRefClick: ((taskId: string) => void) | undefined,
  t: (key: 'chat.viewTask') => string,
  msgId?: string
): React.ReactNode {
  const taskSegments = splitTaskRefSegments(text, tasks)
  return taskSegments.map((tSeg, j) =>
    renderTaskRefSegment(tSeg, `t-${j}`, own, onTaskRefClick, t, msgId)
  )
}

function ChatMessageTextInner({
  text,
  members,
  tasks = [],
  own,
  meta,
  msgId,
  onTaskRefClick
}: ChatMessageTextProps): React.ReactElement {
  const { t } = useI18n()

  if (shouldRenderChatMarkdown(text, meta)) {
    const mentionSegments = splitMentionSegments(text, members)
    const hasMentionOrTask =
      mentionSegments.some((s) => s.kind === 'mention') ||
      tasks.length > 0

    if (!hasMentionOrTask) {
      return <MarkdownView content={text} variant="block" cacheKey={msgId} />
    }

    return (
      <span className={styles.chatMarkdownWrap}>
        {mentionSegments.map((seg, i) => {
          if (seg.kind === 'mention') {
            return (
              <span
                key={`${i}-m-${seg.value}`}
                className={own ? styles.mentionOwn : styles.mention}
                title={seg.userId}
              >
                {seg.value}
              </span>
            )
          }
          return (
            <span key={`${i}-txt`}>
              {renderTextWithTaskRefs(seg.value, tasks, own, onTaskRefClick, t, msgId)}
            </span>
          )
        })}
      </span>
    )
  }

  const mentionSegments = splitMentionSegments(text, members)
  return (
    <span>
      {mentionSegments.map((seg, i) => {
        if (seg.kind === 'mention') {
          return (
            <span
              key={`${i}-m-${seg.value}`}
              className={own ? styles.mentionOwn : styles.mention}
              title={seg.userId}
            >
              {seg.value}
            </span>
          )
        }
        return (
          <span key={`${i}-txt`}>
            {renderTextWithTaskRefs(seg.value, tasks, own, onTaskRefClick, t, msgId)}
          </span>
        )
      })}
    </span>
  )
}

export default memo(ChatMessageTextInner)

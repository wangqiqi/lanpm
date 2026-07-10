import type { GroupMemberView } from '@shared/chat/members'
import type { Task } from '@shared/task/types'
import { splitMentionSegments } from '@shared/chat/mentions'
import { splitTaskRefSegments } from '@shared/chat/taskRefs'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface MentionTextProps {
  text: string
  members: GroupMemberView[]
  tasks?: Task[]
  own?: boolean
  onTaskRefClick?: (taskId: string) => void
}

export default function MentionText({
  text,
  members,
  tasks = [],
  own,
  onTaskRefClick
}: MentionTextProps): React.ReactElement {
  const { t } = useI18n()
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
        const taskSegments = splitTaskRefSegments(seg.value, tasks)
        return taskSegments.map((tSeg, j) =>
          tSeg.kind === 'taskRef' ? (
            tSeg.taskId && onTaskRefClick ? (
              <button
                key={`${i}-t-${j}-${tSeg.value}`}
                type="button"
                className={`${own ? styles.taskRefOwn : styles.taskRef} ${styles.taskRefLink}`}
                title={tSeg.taskId}
                aria-label={t('chat.viewTask')}
                onClick={() => onTaskRefClick(tSeg.taskId!)}
              >
                {tSeg.value}
              </button>
            ) : (
              <span
                key={`${i}-t-${j}-${tSeg.value}`}
                className={own ? styles.taskRefOwn : styles.taskRef}
                title={tSeg.taskId}
              >
                {tSeg.value}
              </span>
            )
          ) : (
            <span key={`${i}-x-${j}`}>{tSeg.value}</span>
          )
        )
      })}
    </span>
  )
}

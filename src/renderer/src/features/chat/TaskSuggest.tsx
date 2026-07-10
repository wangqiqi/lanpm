import type { Task, TaskStatus } from '@shared/task/types'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './chat.module.css'

const STATUS_KEYS: Record<TaskStatus, MessageKey> = {
  todo: 'board.columnTodo',
  doing: 'board.columnDoing',
  done: 'board.columnDone',
  other: 'board.columnOther'
}

interface TaskSuggestProps {
  candidates: Task[]
  activeIndex: number
  onPick: (task: Task) => void
  statusLabel: (status: TaskStatus) => string
}

export default function TaskSuggest({
  candidates,
  activeIndex,
  onPick,
  statusLabel
}: TaskSuggestProps): React.ReactElement | null {
  if (candidates.length === 0) return null

  return (
    <div className={styles.mentionSuggest} role="listbox" aria-label="Task suggestions">
      {candidates.map((task, idx) => (
        <button
          key={task.taskId}
          type="button"
          role="option"
          aria-selected={idx === activeIndex}
          className={`${styles.mentionOption} ${idx === activeIndex ? styles.mentionOptionActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault()
            onPick(task)
          }}
        >
          <span>#{task.title}</span>
          <span className={styles.mentionOptionId}>{statusLabel(task.status)}</span>
        </button>
      ))}
    </div>
  )
}

export function taskStatusMessageKey(status: TaskStatus): MessageKey {
  return STATUS_KEYS[status]
}

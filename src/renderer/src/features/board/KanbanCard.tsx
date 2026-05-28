import { Tag } from 'antd'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task, TaskPriority } from '@shared/task/types'
import styles from './board.module.css'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'default',
  high: 'red',
  medium: 'orange'
}

interface KanbanCardProps {
  task: Task
}

export default function KanbanCard({ task }: KanbanCardProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.taskId,
    data: { task }
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className={styles.cardTitle}>{task.title}</div>
      <div className={styles.cardMeta}>
        <Tag color={PRIORITY_COLOR[task.priority]}>{task.priority}</Tag>
        {task.assigneeUserId && <span>@{task.assigneeUserId}</span>}
        <span>{task.progressPercent}%</span>
      </div>
      {task.status === 'other' && task.otherReason && (
        <div className={styles.otherReason}>{task.otherReason}</div>
      )}
    </div>
  )
}

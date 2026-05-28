import { Popconfirm, Tag } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { Task, TaskPriority } from '@shared/task/types'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './board.module.css'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'default',
  high: 'red',
  medium: 'orange'
}

interface KanbanCardProps {
  task: Task
  onDelete?: (taskId: string) => void
}

export default function KanbanCard({ task, onDelete }: KanbanCardProps): React.ReactElement {
  const { t } = useI18n()
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
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{task.title}</div>
        {onDelete && (
          <Popconfirm
            title={t('board.deleteConfirmTitle')}
            description={t('board.deleteConfirmDesc')}
            okText={t('common.delete')}
            cancelText={t('common.cancel')}
            onConfirm={(e) => {
              e?.stopPropagation()
              onDelete(task.taskId)
            }}
            onCancel={(e) => e?.stopPropagation()}
          >
            <button
              type="button"
              className={styles.cardDelete}
              aria-label={t('board.deleteTaskAria')}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <DeleteOutlined />
            </button>
          </Popconfirm>
        )}
      </div>
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

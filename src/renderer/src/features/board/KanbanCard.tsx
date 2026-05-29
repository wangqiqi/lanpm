import { Button, Dropdown, Popconfirm, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './board.module.css'

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  low: 'default',
  high: 'red',
  medium: 'orange'
}

const MOVE_COLUMN_KEYS: Record<TaskStatus, MessageKey> = {
  todo: 'board.columnTodo',
  doing: 'board.columnDoing',
  done: 'board.columnDone',
  other: 'board.columnOther'
}

interface KanbanCardProps {
  task: Task
  assigneeName?: string
  onDelete?: (taskId: string) => void
  onDiscuss?: (task: Task) => void
  onMoveTo?: (taskId: string, status: TaskStatus) => void
  highlighted?: boolean
}

export default function KanbanCard({
  task,
  assigneeName,
  onDelete,
  onDiscuss,
  onMoveTo,
  highlighted = false
}: KanbanCardProps): React.ReactElement {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.taskId,
    data: { task }
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const moveMenuItems: MenuProps['items'] = onMoveTo
    ? KANBAN_COLUMN_ORDER.filter((status) => status !== task.status).map((status) => ({
        key: status,
        label: t(MOVE_COLUMN_KEYS[status]),
        onClick: () => onMoveTo(task.taskId, status)
      }))
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${highlighted ? styles.searchHighlight : ''}`}
      data-task-id={task.taskId}
      {...listeners}
      {...attributes}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{task.title}</div>
        <div className={styles.cardActions}>
          {moveMenuItems && moveMenuItems.length > 0 && (
            <Dropdown menu={{ items: moveMenuItems }} trigger={['click']}>
              <button
                type="button"
                className={styles.cardMenu}
                aria-label={t('board.moveToColumnMenu')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreOutlined />
              </button>
            </Dropdown>
          )}
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
      </div>
      <div className={styles.cardMeta}>
        <Tag color={PRIORITY_COLOR[task.priority]}>
          {t(
            task.priority === 'low'
              ? 'board.priorityLow'
              : task.priority === 'high'
                ? 'board.priorityHigh'
                : 'board.priorityMedium'
          )}
        </Tag>
        {task.assigneeUserId && (
          <span>@{assigneeName ?? task.assigneeUserId}</span>
        )}
        {task.milestone && (
          <Tag color="blue">{t('board.milestone')}</Tag>
        )}
        {task.endDate && (
          <span className={styles.cardDue}>{t('board.dueDate', { date: task.endDate })}</span>
        )}
        <span>{task.progressPercent}%</span>
      </div>
      {onDiscuss && (
        <Button
          type="link"
          size="small"
          className={styles.discussBtn}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onDiscuss(task)
          }}
        >
          {t('board.discussInChat')}
        </Button>
      )}
      {task.status === 'other' && task.otherReason && (
        <div className={styles.otherReason}>{task.otherReason}</div>
      )}
    </div>
  )
}

import { Dropdown, Modal, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { MoreOutlined } from '@ant-design/icons'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './board.module.css'

const PRIORITY_CLASS: Record<TaskPriority, string> = {
  low: styles.priorityLow,
  high: styles.priorityHigh,
  medium: styles.priorityMedium
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
  onEdit?: (task: Task) => void
  highlighted?: boolean
}

export default function KanbanCard({
  task,
  assigneeName,
  onDelete,
  onDiscuss,
  onMoveTo,
  onEdit,
  highlighted = false
}: KanbanCardProps): React.ReactElement {
  const { t } = useI18n()
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: task.taskId,
    data: { task }
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: task.taskId })

  const setNodeRef = (node: HTMLElement | null): void => {
    setDragRef(node)
    setDropRef(node)
  }

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const menuItems: MenuProps['items'] = []

  if (onEdit) {
    menuItems.push({
      key: 'edit',
      label: t('board.editTitle'),
      onClick: () => onEdit(task)
    })
  }

  if (onDiscuss) {
    menuItems.push({
      key: 'discuss',
      label: t('board.discussInChat'),
      onClick: () => onDiscuss(task)
    })
  }

  const moveTargets = onMoveTo
    ? KANBAN_COLUMN_ORDER.filter((status) => status !== task.status)
    : []

  if (moveTargets.length > 0) {
    if (menuItems.length > 0) {
      menuItems.push({ type: 'divider' })
    }
    for (const status of moveTargets) {
      menuItems.push({
        key: `move-${status}`,
        label: t('board.moveToColumn', { column: t(MOVE_COLUMN_KEYS[status]) }),
        onClick: () => onMoveTo!(task.taskId, status)
      })
    }
  }

  if (onDelete) {
    if (menuItems.length > 0) {
      menuItems.push({ type: 'divider' })
    }
    menuItems.push({
      key: 'delete',
      label: t('common.delete'),
      danger: true,
      onClick: () => {
        Modal.confirm({
          title: t('board.deleteConfirmTitle'),
          content: t('board.deleteConfirmDesc'),
          okText: t('common.delete'),
          cancelText: t('common.cancel'),
          okButtonProps: { danger: true },
          onOk: () => onDelete(task.taskId)
        })
      }
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${isOver ? styles.cardOver : ''} ${highlighted ? styles.searchHighlight : ''}`}
      data-task-id={task.taskId}
      title={onEdit ? t('board.editDoubleClickHint') : undefined}
      onDoubleClick={
        onEdit
          ? (e) => {
              e.stopPropagation()
              onEdit(task)
            }
          : undefined
      }
      {...listeners}
      {...attributes}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{task.title}</div>
        {menuItems.length > 0 && (
          <div className={styles.cardActions}>
            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <button
                type="button"
                className={styles.cardMenu}
                aria-label={t('board.cardMenuAria')}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreOutlined />
              </button>
            </Dropdown>
          </div>
        )}
      </div>
      <div className={styles.cardMeta}>
        <Tag bordered={false} className={PRIORITY_CLASS[task.priority]}>
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
          <Tag bordered={false} className={styles.milestoneTag}>
            {t('board.milestone')}
          </Tag>
        )}
        {task.endDate && (
          <span className={styles.cardDue}>{t('board.dueDate', { date: task.endDate })}</span>
        )}
        <span>{task.progressPercent}%</span>
      </div>
      {task.status === 'other' && task.otherReason && (
        <div className={styles.otherReason}>{task.otherReason}</div>
      )}
    </div>
  )
}

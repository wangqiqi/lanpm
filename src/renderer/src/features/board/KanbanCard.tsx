import { Dropdown, Modal, Tag } from 'antd'
import type { MenuProps } from 'antd'
import { MoreOutlined } from '@ant-design/icons'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import type { BoardTaskRelation } from '@shared/task/boardRelations'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import type { TaskLocateView } from '@renderer/features/task/useLocateTask'
import TaskAwarenessBadges from '@renderer/features/task/TaskAwarenessBadges'
import TaskTagChip from '@renderer/features/task/TaskTagChip'
import type { AwarenessPeer } from '@renderer/stores/taskAwarenessStore'
import { taskFamilyStripeClass } from '@renderer/features/task/taskFamilyUi'
import {
  evaluateTaskSchedule,
  kanbanCardScheduleClasses,
  kanbanDueScheduleClass,
  kanbanProgressScheduleClass,
  kanbanScheduleBadgeKey,
  scheduleHealthHintKey
} from '@renderer/features/task/scheduleHealthUi'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { PluginZoneHost } from '@renderer/plugin/PluginSlot'
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
  groupId: string
  task: Task
  relation?: BoardTaskRelation
  assigneeName?: string
  relationDimmed?: boolean
  relationFocused?: boolean
  onDelete?: (taskId: string) => void
  onDiscuss?: (task: Task) => void
  onMoveTo?: (taskId: string, status: TaskStatus) => void
  onEdit?: (task: Task) => void
  onHighlightRelations?: (taskId: string | null) => void
  onPinRelations?: (taskId: string | null) => void
  onLocateTask?: (taskId: string, view: TaskLocateView) => void
  highlighted?: boolean
  focusPeers?: AwarenessPeer[]
  tagColorOverrides?: Readonly<Record<string, string>> | null
}

export default function KanbanCard({
  groupId,
  task,
  relation,
  assigneeName,
  relationDimmed = false,
  relationFocused = false,
  onDelete,
  onDiscuss,
  onMoveTo,
  onEdit,
  onHighlightRelations,
  onPinRelations,
  onLocateTask,
  highlighted = false,
  focusPeers = [],
  tagColorOverrides = null
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

  const familyClass =
    relation && relation.familyIndex >= 0
      ? taskFamilyStripeClass(relation.familyIndex)
      : undefined
  const blocked = (relation?.blockedBy.length ?? 0) > 0
  const { health: scheduleHealth } = evaluateTaskSchedule(task)
  const scheduleHintKey = scheduleHealthHintKey(scheduleHealth)
  const scheduleBadgeKey = kanbanScheduleBadgeKey(scheduleHealth)

  const menuItems: MenuProps['items'] = []

  if (onPinRelations) {
    menuItems.push({
      key: 'highlight',
      label: relationFocused ? t('board.relClearHighlight') : t('board.relHighlight'),
      onClick: () => onPinRelations(relationFocused ? null : task.taskId)
    })
  }

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

  if (onLocateTask) {
    if (menuItems.length > 0) {
      menuItems.push({ type: 'divider' })
    }
    menuItems.push({
      key: 'locate-tree',
      label: t('task.openInTree'),
      onClick: () => onLocateTask(task.taskId, 'tree')
    })
    menuItems.push({
      key: 'locate-gantt',
      label: t('task.openInGantt'),
      onClick: () => onLocateTask(task.taskId, 'gantt')
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

  const relationTags: { key: string; label: string; className: string }[] = []
  if (relation?.parentTitle) {
    relationTags.push({
      key: 'parent',
      label: t('board.relParent', { title: relation.parentTitle }),
      className: styles.relationTagFamily
    })
  }
  if (relation && relation.childCount > 0) {
    relationTags.push({
      key: 'children',
      label: t('board.relChildren', { count: relation.childCount }),
      className: styles.relationTagFamily
    })
  }
  if (relation && relation.siblingCount > 0) {
    relationTags.push({
      key: 'siblings',
      label: t('board.relSiblings', { count: relation.siblingCount }),
      className: styles.relationTagFamily
    })
  }
  for (const b of relation?.blockedBy ?? []) {
    relationTags.push({
      key: `block-${b.taskId}`,
      label: t('board.relBlockedDep', { type: b.type, title: b.title }),
      className: styles.relationTagWarn
    })
  }
  for (const s of (relation?.successors ?? []).slice(0, 2)) {
    relationTags.push({
      key: `succ-${s.taskId}`,
      label: t('board.relBlocks', { title: s.title, type: s.type }),
      className: styles.relationTagDep
    })
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        styles.card,
        familyClass,
        isDragging ? styles.cardDragging : '',
        isOver ? styles.cardOver : '',
        highlighted ? styles.searchHighlight : '',
        blocked ? styles.cardBlocked : '',
        ...kanbanCardScheduleClasses(scheduleHealth),
        relationDimmed ? styles.cardRelationDimmed : '',
        relationFocused ? styles.cardRelationFocus : ''
      ]
        .filter(Boolean)
        .join(' ')}
      data-task-id={task.taskId}
      title={
        scheduleHintKey
          ? t(scheduleHintKey)
          : onEdit
            ? t('board.editDoubleClickHint')
            : undefined
      }
      onDoubleClick={
        onEdit
          ? (e) => {
              e.stopPropagation()
              onEdit(task)
            }
          : undefined
      }
      onMouseEnter={() => onHighlightRelations?.(task.taskId)}
      onMouseLeave={() => onHighlightRelations?.(null)}
      {...listeners}
      {...attributes}
    >
      {relationTags.length > 0 && (
        <div className={styles.cardRelations}>
          {relationTags.slice(0, 4).map((tag) => (
            <Tag key={tag.key} bordered={false} className={`${styles.relationTag} ${tag.className}`}>
              {tag.label}
            </Tag>
          ))}
        </div>
      )}
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
        {scheduleBadgeKey && (
          <Tag
            bordered={false}
            className={
              scheduleHealth === 'overdue' ? styles.scheduleBadgeOverdue : styles.scheduleBadgeBehind
            }
          >
            {t(scheduleBadgeKey)}
          </Tag>
        )}
        <Tag bordered={false} className={PRIORITY_CLASS[task.priority]}>
          {t(
            task.priority === 'low'
              ? 'board.priorityLow'
              : task.priority === 'high'
                ? 'board.priorityHigh'
                : 'board.priorityMedium'
          )}
        </Tag>
        {(task.tags ?? []).slice(0, 4).map((label) => (
          <TaskTagChip key={label} label={label} colorOverrides={tagColorOverrides} />
        ))}
        {task.assigneeUserId && (
          <span>@{assigneeName ?? task.assigneeUserId}</span>
        )}
        {task.milestone && (
          <Tag bordered={false} className={styles.milestoneTag}>
            {t('board.milestone')}
          </Tag>
        )}
        {task.endDate && (
          <span
            className={[styles.cardDue, kanbanDueScheduleClass(scheduleHealth)]
              .filter(Boolean)
              .join(' ')}
          >
            {t('board.dueDate', { date: task.endDate })}
          </span>
        )}
        <span
          className={kanbanProgressScheduleClass(scheduleHealth) ?? undefined}
        >
          {task.progressPercent}%
        </span>
      </div>
      {task.status === 'other' && task.otherReason && (
        <div className={styles.otherReason}>{task.otherReason}</div>
      )}
      <PluginZoneHost
        zone="card"
        context={{
          groupId,
          view: 'board',
          selection: { taskId: task.taskId }
        }}
      />
      <TaskAwarenessBadges peers={focusPeers} />
    </div>
  )
}

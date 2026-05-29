import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { Button, Form, Input, Modal, Select } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { KANBAN_COLUMN_ORDER, isTaskStatus, KANBAN_TRASH_DROP_ID, isKanbanTrashDropId } from '@shared/task/kanban'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import type { MessageKey } from '@renderer/i18n/messages'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import KanbanCard from './KanbanCard'
import OtherReasonModal from './OtherReasonModal'
import TaskEditModal from './TaskEditModal'
import ViewToolbar, { ViewToolbarGroup, ViewToolbarHint } from '@renderer/ui/ViewToolbar'
import ViewCrossLink from '@renderer/ui/ViewCrossLink'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import {
  confirmDeleteParentTask,
  countTaskDescendants
} from '@renderer/features/task/confirmDeleteParentTask'
import styles from './board.module.css'

const COLUMN_TITLE_KEYS: Record<TaskStatus, MessageKey> = {
  todo: 'board.columnTodo',
  doing: 'board.columnDoing',
  done: 'board.columnDone',
  other: 'board.columnOther'
}

const PRIORITY_OPTIONS: { value: TaskPriority; key: MessageKey }[] = [
  { value: 'low', key: 'board.priorityLow' },
  { value: 'medium', key: 'board.priorityMedium' },
  { value: 'high', key: 'board.priorityHigh' }
]

function arrayMove<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  if (moved === undefined) return items
  next.splice(to, 0, moved)
  return next
}

function TrashDropZone({
  visible,
  isOver
}: {
  visible: boolean
  isOver: boolean
}): React.ReactElement | null {
  const { t } = useI18n()
  const { setNodeRef } = useDroppable({ id: KANBAN_TRASH_DROP_ID })

  if (!visible) return null

  return (
    <div
      ref={setNodeRef}
      className={`${styles.trashZone} ${isOver ? styles.trashZoneOver : ''}`}
      aria-live="polite"
    >
      <DeleteOutlined aria-hidden />
      <span>{t('board.trashDrop')}</span>
    </div>
  )
}

function KanbanColumn({
  groupId,
  status,
  tasks,
  isOver,
  invalid,
  onAddTask,
  onDeleteTask,
  onDiscuss,
  onMoveTo,
  onEdit,
  getMemberDisplayName,
  isTaskHighlighted
}: {
  groupId: string
  status: TaskStatus
  tasks: Task[]
  isOver: boolean
  invalid: boolean
  onAddTask?: () => void
  onDeleteTask?: (taskId: string) => void
  onDiscuss: (task: Task) => void
  onMoveTo: (taskId: string, status: TaskStatus) => void
  onEdit: (task: Task) => void
  getMemberDisplayName: (groupId: string, userId: string) => string
  isTaskHighlighted: (taskId: string) => boolean
}): React.ReactElement {
  const { t } = useI18n()
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? (invalid ? styles.columnInvalid : styles.columnOver) : ''}`}
    >
      <div className={styles.columnHeader}>
        <div className={styles.columnHeaderTitle}>
          {t(COLUMN_TITLE_KEYS[status])}
          <span className={styles.columnCount}>{tasks.length}</span>
        </div>
        {onAddTask ? (
          <Button
            type="text"
            size="small"
            icon={<PlusOutlined />}
            className={styles.columnAddBtn}
            aria-label={t('board.newTask')}
            onClick={onAddTask}
          />
        ) : null}
      </div>
      <div className={styles.columnBody}>
        {tasks.length === 0 && (
          <div className={styles.columnDropHint}>{t('board.dropHere')}</div>
        )}
        {tasks.map((task) => (
          <KanbanCard
            key={task.taskId}
            task={task}
            assigneeName={
              task.assigneeUserId
                ? getMemberDisplayName(groupId, task.assigneeUserId)
                : undefined
            }
            onDelete={onDeleteTask}
            onDiscuss={onDiscuss}
            onMoveTo={onMoveTo}
            onEdit={onEdit}
            highlighted={isTaskHighlighted(task.taskId)}
          />
        ))}
      </div>
    </div>
  )
}

export default function BoardView(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const createTask = useTaskStore((s) => s.createTask)
  const moveTask = useTaskStore((s) => s.moveTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const loadMembers = useChatMembersStore((s) => s.loadMembers)
  const getMemberDisplayName = useChatMembersStore((s) => s.getMemberDisplayName)

  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)
  const [overTrash, setOverTrash] = useState(false)
  const [pendingOther, setPendingOther] = useState<{ taskId: string; title: string } | null>(null)
  const [otherLoading, setOtherLoading] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const boardReady = !loading || tasks.length > 0
  const { isHighlighted: isTaskHighlighted } = useSearchHighlight('task', boardReady)

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      doing: [],
      done: [],
      other: []
    }
    for (const t of tasks) {
      map[t.status].push(t)
    }
    for (const col of KANBAN_COLUMN_ORDER) {
      map[col].sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [tasks])

  useEffect(() => {
    if (!gid) return
    void loadTasks(gid)
    void loadMembers(gid)
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === gid) void loadTasks(gid)
    })
    return unsub
  }, [gid, loadTasks, loadMembers])

  const handleDiscuss = useCallback(
    (task: Task) => {
      navigate(groupViewPath(gid, 'chat'), {
        state: { composeDraft: t('board.discussDraft', { title: task.title }) }
      })
    },
    [gid, navigate, t]
  )

  const handleDragStart = (event: DragStartEvent): void => {
    const task = tasks.find((t) => t.taskId === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragOver = (event: DragOverEvent): void => {
    const overId = event.over?.id
    if (typeof overId === 'string' && isKanbanTrashDropId(overId)) {
      setOverTrash(true)
      setOverColumn(null)
    } else if (typeof overId === 'string' && isTaskStatus(overId)) {
      setOverTrash(false)
      setOverColumn(overId)
    } else if (typeof overId === 'string') {
      const overTask = tasks.find((t) => t.taskId === overId)
      setOverTrash(false)
      setOverColumn(overTask?.status ?? null)
    } else {
      setOverTrash(false)
      setOverColumn(null)
    }
  }

  const finishMove = useCallback(
    async (taskId: string, status: TaskStatus, otherReason?: string, sortOrder?: number) => {
      try {
        await moveTask({ taskId, status, otherReason, sortOrder })
      } catch (err) {
        message.error(formatError(err, 'board.moveFailed'))
      }
    },
    [moveTask, message, t]
  )

  const reorderWithinColumn = useCallback(
    async (status: TaskStatus, activeId: string, overId: string) => {
      const columnTasks = tasksByColumn[status]
      const oldIndex = columnTasks.findIndex((t) => t.taskId === activeId)
      const newIndex = columnTasks.findIndex((t) => t.taskId === overId)
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return
      const reordered = arrayMove(columnTasks, oldIndex, newIndex)
      try {
        for (let i = 0; i < reordered.length; i++) {
          const task = reordered[i]!
          if (task.sortOrder !== i) {
            await moveTask({ taskId: task.taskId, status: task.status, sortOrder: i })
          }
        }
      } catch (err) {
        message.error(formatError(err, 'board.moveFailed'))
      }
    },
    [tasksByColumn, moveTask, message, t]
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveTask(null)
    setOverColumn(null)
    setOverTrash(false)
    const taskId = String(event.active.id)
    const overId = event.over?.id
    if (!overId) return

    if (isKanbanTrashDropId(String(overId))) {
      void handleDelete(taskId)
      return
    }

    if (isTaskStatus(String(overId))) {
      const targetStatus = String(overId) as TaskStatus
      const task = tasks.find((t) => t.taskId === taskId)
      if (!task || task.status === targetStatus) return

      if (targetStatus === 'other') {
        setPendingOther({ taskId, title: task.title })
        return
      }

      void finishMove(taskId, targetStatus)
      return
    }

    const overTask = tasks.find((t) => t.taskId === String(overId))
    const activeTaskItem = tasks.find((t) => t.taskId === taskId)
    if (!overTask || !activeTaskItem) return

    if (activeTaskItem.status === overTask.status) {
      void reorderWithinColumn(activeTaskItem.status, taskId, String(overId))
      return
    }

    if (overTask.status === 'other') {
      setPendingOther({ taskId, title: activeTaskItem.title })
      return
    }

    void finishMove(taskId, overTask.status)
  }

  const handleMoveTo = useCallback(
    (taskId: string, status: TaskStatus) => {
      const task = tasks.find((t) => t.taskId === taskId)
      if (!task || task.status === status) return
      if (status === 'other') {
        setPendingOther({ taskId, title: task.title })
        return
      }
      void finishMove(taskId, status)
    },
    [tasks, finishMove]
  )

  const handleDelete = useCallback(
    async (taskId: string) => {
      const task = tasks.find((t) => t.taskId === taskId)
      if (!task) return
      const childCount = countTaskDescendants(tasks, taskId)
      const mode =
        childCount > 0
          ? await confirmDeleteParentTask({ t, taskTitle: task.title, childCount })
          : 'promote'
      if (!mode) return
      try {
        const ok = await deleteTask(taskId, mode)
        if (ok) message.success(t('board.deleted'))
        else message.warning(t('board.notFound'))
      } catch (err) {
        message.error(formatError(err, 'board.deleteFailed'))
      }
    },
    [tasks, deleteTask, t]
  )

  const handleCreate = async (): Promise<void> => {
    const title = newTitle.trim()
    if (!title) {
      message.warning(t('chat.taskTitleRequired'))
      return
    }
    if (!gid) return
    try {
      await createTask({ groupId: gid, title, priority: newPriority })
      setNewTitle('')
      if (createOpen) setCreateOpen(false)
      message.success(t('board.created'))
    } catch (err) {
      message.error(formatError(err, 'board.createFailed'))
    }
  }

  const handleOpenCreate = (): void => {
    setCreateOpen(true)
  }

  const handleEditSave = useCallback(
    async (input: {
      taskId: string
      title: string
      description: string
      status: TaskStatus
      otherReason: string | null
      priority: TaskPriority
      assigneeUserId: string | null
      startDate: string | null
      endDate: string | null
      progressPercent: number
      milestone: boolean
    }) => {
      try {
        await updateTask({
          taskId: input.taskId,
          title: input.title,
          description: input.description || undefined,
          status: input.status,
          otherReason: input.otherReason,
          priority: input.priority,
          assigneeUserId: input.assigneeUserId,
          startDate: input.startDate,
          endDate: input.endDate,
          progressPercent: input.progressPercent,
          milestone: input.milestone
        })
        message.success(t('tree.detailSaved'))
      } catch (err) {
        message.error(formatError(err, 'tree.updateFailed'))
        throw err
      }
    },
    [updateTask, message, t]
  )

  const editTaskLive = editTask
    ? tasks.find((t) => t.taskId === editTask.taskId) ?? editTask
    : null

  const showBoardToolbar = !loading && tasks.length > 0

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          showBoardToolbar ? (
            <ViewToolbarGroup>
              <ViewToolbarHint>{t('board.toolbarHint')}</ViewToolbarHint>
            </ViewToolbarGroup>
          ) : undefined
        }
        end={
          <ViewCrossLink onClick={() => navigate(groupViewPath(gid, 'tree'))}>
            {t('board.treeViewLink')}
          </ViewCrossLink>
        }
      />

      {loading && tasks.length === 0 ? (
        <ViewLoadingCenter />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.boardBody}>
            <TrashDropZone visible={!!activeTask} isOver={overTrash} />
            <div className={styles.columns}>
            {KANBAN_COLUMN_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                groupId={gid}
                status={status}
                tasks={tasksByColumn[status]}
                isOver={overColumn === status}
                invalid={false}
                onAddTask={status === 'todo' ? handleOpenCreate : undefined}
                onDeleteTask={(id) => void handleDelete(id)}
                onDiscuss={handleDiscuss}
                onMoveTo={handleMoveTo}
                onEdit={setEditTask}
                getMemberDisplayName={getMemberDisplayName}
                isTaskHighlighted={isTaskHighlighted}
              />
            ))}
            </div>
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className={styles.overlayCard}>{activeTask.title}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        title={t('board.createTitle')}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText={t('common.create')}
      >
        <Form layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item label={t('chat.taskTitleLabel')} required>
            <Input
              placeholder={t('board.taskTitlePlaceholder')}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onPressEnter={() => void handleCreate()}
            />
          </Form.Item>
          <Form.Item label={t('common.priority')}>
            <Select
              value={newPriority}
              onChange={setNewPriority}
              style={{ width: '100%' }}
              options={PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: t(o.key) }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <OtherReasonModal
        open={!!pendingOther}
        taskTitle={pendingOther?.title}
        loading={otherLoading}
        onCancel={() => setPendingOther(null)}
        onConfirm={(reason) => {
          if (!pendingOther) return
          setOtherLoading(true)
          void finishMove(pendingOther.taskId, 'other', reason).finally(() => {
            setOtherLoading(false)
            setPendingOther(null)
          })
        }}
      />

      <TaskEditModal
        open={!!editTask}
        groupId={gid}
        task={editTaskLive}
        onCancel={() => setEditTask(null)}
        onSave={handleEditSave}
      />
    </div>
  )
}

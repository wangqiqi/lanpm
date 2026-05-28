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
import { Button, Input, Modal, Select, Spin, Tag, message } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { KANBAN_COLUMN_LABELS, KANBAN_COLUMN_ORDER, isTaskStatus } from '@shared/task/kanban'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import KanbanCard from './KanbanCard'
import OtherReasonModal from './OtherReasonModal'
import styles from './board.module.css'

function KanbanColumn({
  status,
  tasks,
  isOver,
  invalid,
  onDeleteTask
}: {
  status: TaskStatus
  tasks: Task[]
  isOver: boolean
  invalid: boolean
  onDeleteTask?: (taskId: string) => void
}): React.ReactElement {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? (invalid ? styles.columnInvalid : styles.columnOver) : ''}`}
    >
      <div className={styles.columnHeader}>
        {KANBAN_COLUMN_LABELS[status]}
        <Tag style={{ marginLeft: 8 }}>{tasks.length}</Tag>
      </div>
      <div className={styles.columnBody}>
        {tasks.map((task) => (
          <KanbanCard key={task.taskId} task={task} onDelete={onDeleteTask} />
        ))}
      </div>
    </div>
  )
}

export default function BoardView(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const createTask = useTaskStore((s) => s.createTask)
  const moveTask = useTaskStore((s) => s.moveTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)

  const [createOpen, setCreateOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null)
  const [pendingOther, setPendingOther] = useState<{ taskId: string; title: string } | null>(null)
  const [otherLoading, setOtherLoading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const boardTasks = useMemo(
    () => tasks.filter((t) => !t.parentTaskId),
    [tasks]
  )

  const tasksByColumn = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      todo: [],
      doing: [],
      done: [],
      other: []
    }
    for (const t of boardTasks) {
      map[t.status].push(t)
    }
    for (const col of KANBAN_COLUMN_ORDER) {
      map[col].sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [boardTasks])

  useEffect(() => {
    if (!gid) return
    void loadTasks(gid)
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === gid) void loadTasks(gid)
    })
    return unsub
  }, [gid, loadTasks])

  const handleDragStart = (event: DragStartEvent): void => {
    const task = boardTasks.find((t) => t.taskId === event.active.id)
    setActiveTask(task ?? null)
  }

  const handleDragOver = (event: DragOverEvent): void => {
    const overId = event.over?.id
    if (typeof overId === 'string' && isTaskStatus(overId)) {
      setOverColumn(overId)
    } else {
      setOverColumn(null)
    }
  }

  const finishMove = useCallback(
    async (taskId: string, status: TaskStatus, otherReason?: string) => {
      try {
        await moveTask({ taskId, status, otherReason })
      } catch (err) {
        message.error(err instanceof Error ? err.message : '移动失败')
      }
    },
    [moveTask]
  )

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveTask(null)
    setOverColumn(null)
    const taskId = String(event.active.id)
    const overId = event.over?.id
    if (!overId || !isTaskStatus(String(overId))) return

    const targetStatus = String(overId) as TaskStatus
    const task = boardTasks.find((t) => t.taskId === taskId)
    if (!task || task.status === targetStatus) return

    if (targetStatus === 'other') {
      setPendingOther({ taskId, title: task.title })
      return
    }

    void finishMove(taskId, targetStatus)
  }

  const handleDelete = useCallback(
    async (taskId: string) => {
      try {
        const ok = await deleteTask(taskId)
        if (ok) message.success('任务已删除')
        else message.warning('任务不存在')
      } catch (err) {
        message.error(err instanceof Error ? err.message : '删除失败')
      }
    },
    [deleteTask]
  )

  const handleCreate = async (): Promise<void> => {
    const title = newTitle.trim()
    if (!title || !gid) return
    try {
      await createTask({ groupId: gid, title, priority: newPriority })
      setNewTitle('')
      setCreateOpen(false)
      message.success('任务已创建')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新建任务
        </Button>
        <Button type="link" onClick={() => navigate(groupViewPath(gid, 'tree'))}>
          任务树视图
        </Button>
      </div>

      {loading && tasks.length === 0 ? (
        <Spin />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={styles.columns}>
            {KANBAN_COLUMN_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={tasksByColumn[status]}
                isOver={overColumn === status}
                invalid={false}
                onDeleteTask={(id) => void handleDelete(id)}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className={styles.overlayCard}>{activeTask.title}</div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <Modal
        title="新建任务"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="创建"
      >
        <Input
          placeholder="任务标题"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onPressEnter={() => void handleCreate()}
        />
        <div style={{ marginTop: 12 }}>
          <span style={{ marginRight: 8 }}>优先级</span>
          <Select
            value={newPriority}
            onChange={setNewPriority}
            style={{ width: 120 }}
            options={[
              { value: 'low', label: 'low' },
              { value: 'medium', label: 'medium' },
              { value: 'high', label: 'high' }
            ]}
          />
        </div>
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
    </div>
  )
}

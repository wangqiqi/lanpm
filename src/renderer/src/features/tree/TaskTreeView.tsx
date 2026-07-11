import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, Progress, Slider, Tree, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { DataNode } from 'antd/es/tree'
import { PlusOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import type { Task } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import ViewToolbar, {
  ViewToolbarGroup,
  ViewToolbarHint,
  ViewToolbarPair
} from '@renderer/ui/ViewToolbar'
import ViewCrossLink from '@renderer/ui/ViewCrossLink'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { ancestorKeysForTask, useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import TaskDetailPanel, { type TaskDetailSaveInput } from '@renderer/features/tree/TaskDetailPanel'
import { useI18n } from '@renderer/i18n/useI18n'
import {
  confirmDeleteParentTask,
  countTaskDescendants
} from '@renderer/features/task/confirmDeleteParentTask'
import { buildBoardRelationMap, type BoardTaskRelation } from '@shared/task/boardRelations'
import { TASK_TITLE_MAX_LENGTH, validateTaskTitle } from '@shared/task/validation'
import { taskValidationMessage } from '@renderer/features/task/taskValidationMessage'
import { taskFamilyStripeClass } from '@renderer/features/task/taskFamilyUi'
import {
  evaluateTaskSchedule,
  treeProgressScheduleProps,
  treeRowScheduleClass
} from '@renderer/features/task/scheduleHealthUi'
import { useLocateTask } from '@renderer/features/task/useLocateTask'
import styles from './tree.module.css'

const { Text } = Typography

/** First root task in tree order (matches buildTreeData). */
function firstRootTaskId(tasks: Task[]): string | null {
  const taskIds = new Set(tasks.map((t) => t.taskId))
  const roots = tasks.filter((t) => {
    const parentMissing = t.parentTaskId != null && !taskIds.has(t.parentTaskId)
    return t.parentTaskId == null || parentMissing
  })
  roots.sort((a, b) => a.sortOrder - b.sortOrder)
  return roots[0]?.taskId ?? null
}

function applyTaskSelection(
  taskId: string,
  tasks: Task[]
): { parentSelected: boolean } {
  const hasChildren = tasks.some((t) => t.parentTaskId === taskId)
  return { parentSelected: hasChildren }
}

function buildTreeData(
  tasks: Task[],
  relationMap: Map<string, BoardTaskRelation>,
  isTaskHighlighted: (taskId: string) => boolean,
  inlineEditTaskId: string | null,
  onStartInlineEdit: (taskId: string) => void,
  onInlineProgressCommit: (taskId: string, value: number) => void
): DataNode[] {
  const taskIds = new Set(tasks.map((t) => t.taskId))
  const byParent = new Map<string | undefined, Task[]>()
  for (const t of tasks) {
    const parentMissing = t.parentTaskId != null && !taskIds.has(t.parentTaskId)
    const key = parentMissing ? '__root__' : (t.parentTaskId ?? '__root__')
    const list = byParent.get(key) ?? []
    list.push(t)
    byParent.set(key, list)
  }

  const build = (parentKey: string | undefined): DataNode[] => {
    const key = parentKey ?? '__root__'
    const children = byParent.get(key) ?? []
    children.sort((a, b) => a.sortOrder - b.sortOrder)
    return children.map((task) => {
      const childNodes = build(task.taskId)
      const hasChildren = childNodes.length > 0
      const isLeaf = !hasChildren
      const familyIndex = relationMap.get(task.taskId)?.familyIndex ?? -1
      const familyStripe = taskFamilyStripeClass(familyIndex, { treeNode: true })
      const { health: scheduleHealth } = evaluateTaskSchedule(task)
      const rowScheduleClass = treeRowScheduleClass(scheduleHealth)
      const progressSchedule = treeProgressScheduleProps(scheduleHealth, task.status)

      return {
        key: task.taskId,
        title: (
          <div
            className={`${styles.nodeRow} ${familyStripe ?? ''} ${rowScheduleClass ?? ''} ${isTaskHighlighted(task.taskId) ? styles.searchHighlight : ''}`}
            data-task-id={task.taskId}
          >
            <span className={styles.nodeTitle}>{task.title}</span>
            <div
              className={styles.nodeProgress}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (isLeaf) onStartInlineEdit(task.taskId)
              }}
            >
              {isLeaf && inlineEditTaskId === task.taskId ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Slider
                    min={0}
                    max={100}
                    defaultValue={task.progressPercent}
                    onAfterChange={(v) => onInlineProgressCommit(task.taskId, v)}
                  />
                </div>
              ) : (
                <Progress
                  percent={task.progressPercent}
                  size="small"
                  status={progressSchedule.status}
                  strokeColor={progressSchedule.strokeColor}
                />
              )}
            </div>
          </div>
        ),
        children: hasChildren ? childNodes : undefined,
        isLeaf: !hasChildren
      }
    })
  }

  return build(undefined)
}

export default function TaskTreeView(): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const createTask = useTaskStore((s) => s.createTask)
  const updateTask = useTaskStore((s) => s.updateTask)
  const deleteTask = useTaskStore((s) => s.deleteTask)
  const loadMembers = useChatMembersStore((s) => s.loadMembers)

  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [newRootTitle, setNewRootTitle] = useState('')
  const [childTitle, setChildTitle] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null)
  const [parentSelected, setParentSelected] = useState(false)
  const initialSelectDoneRef = useRef(false)

  const treeReady = !loading || tasks.length > 0
  const { highlightId, isHighlighted: isTaskHighlighted } = useSearchHighlight('task', treeReady)

  const commitInlineProgress = useCallback(
    async (taskId: string, value: number) => {
      try {
        await updateTask({
          taskId,
          progressPercent: Math.min(100, Math.max(0, value))
        })
        message.success(t('tree.progressUpdated'))
        setInlineEditTaskId(null)
      } catch (err) {
        message.error(formatError(err, 'tree.updateFailed'))
      }
    },
    [updateTask, t]
  )

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.taskId === selectedTaskId) ?? null : null),
    [tasks, selectedTaskId]
  )

  useEffect(() => {
    if (!gid) return
    void loadMembers(gid)
  }, [gid, loadMembers])

  const relationMap = useMemo(() => buildBoardRelationMap(tasks), [tasks])

  const locateTask = useLocateTask(gid)

  const treeData = useMemo(
    () =>
      buildTreeData(
        tasks,
        relationMap,
        isTaskHighlighted,
        inlineEditTaskId,
        (taskId) => setInlineEditTaskId(taskId),
        (taskId, value) => void commitInlineProgress(taskId, value)
      ),
    [tasks, relationMap, isTaskHighlighted, inlineEditTaskId, commitInlineProgress]
  )

  useEffect(() => {
    initialSelectDoneRef.current = false
  }, [gid])

  useEffect(() => {
    if (!gid) return
    void loadTasks(gid)
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === gid) void loadTasks(gid)
    })
    return unsub
  }, [gid, loadTasks])

  useEffect(() => {
    if (!highlightId) return
    const ancestors = ancestorKeysForTask(highlightId, tasks)
    if (ancestors.length === 0) return
    setExpandedKeys((keys) => [...new Set([...keys, ...ancestors])])
    setSelectedTaskId(highlightId)
    setSelectedParentId(highlightId)
    const { parentSelected: isParent } = applyTaskSelection(highlightId, tasks)
    setParentSelected(isParent)
    initialSelectDoneRef.current = true
  }, [highlightId, tasks])

  useEffect(() => {
    if (highlightId || selectedTaskId || initialSelectDoneRef.current) return
    if (!treeReady || tasks.length === 0) return
    const id = firstRootTaskId(tasks)
    if (!id) return
    setSelectedTaskId(id)
    setSelectedParentId(id)
    setParentSelected(applyTaskSelection(id, tasks).parentSelected)
    initialSelectDoneRef.current = true
  }, [highlightId, selectedTaskId, treeReady, tasks])

  const onSelect = useCallback(
    (keys: React.Key[]) => {
      const id = keys[0]
      if (typeof id !== 'string') {
        setParentSelected(false)
        setInlineEditTaskId(null)
        setSelectedTaskId(null)
        return
      }
      setSelectedParentId(id)
      setSelectedTaskId(id)
      const { parentSelected: isParent } = applyTaskSelection(id, tasks)
      setParentSelected(isParent)
      if (isParent) setInlineEditTaskId(null)
    },
    [tasks]
  )

  const handleDetailSave = useCallback(
    async (input: TaskDetailSaveInput) => {
      await updateTask({
        taskId: input.taskId,
        title: input.title,
        description: input.description || undefined,
        status: input.status,
        otherReason: input.otherReason,
        priority: input.priority,
        assigneeUserId: input.assigneeUserId,
        tags: input.tags,
        startDate: input.startDate,
        endDate: input.endDate,
        progressPercent: input.progressPercent,
        milestone: input.milestone
      })
    },
    [updateTask]
  )

  const handleDetailDelete = useCallback(
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
        if (ok) {
          message.success(t('tree.detailDeleted'))
          const remaining = tasks.filter((t) => t.taskId !== taskId)
          const nextId = firstRootTaskId(remaining)
          setSelectedTaskId(nextId)
          setSelectedParentId(nextId)
          setParentSelected(nextId ? applyTaskSelection(nextId, remaining).parentSelected : false)
        } else {
          message.warning(t('board.notFound'))
        }
      } catch (err) {
        message.error(formatError(err, 'board.deleteFailed'))
      }
    },
    [tasks, deleteTask, t, message]
  )

  const handleCreateRoot = async (): Promise<void> => {
    const title = newRootTitle.trim()
    if (!title) {
      message.warning(t('chat.taskTitleRequired'))
      return
    }
    const titleErr = validateTaskTitle(newRootTitle)
    if (titleErr) {
      message.warning(taskValidationMessage(t, titleErr))
      return
    }
    if (!gid) return
    try {
      await createTask({ groupId: gid, title })
      setNewRootTitle('')
      message.success(t('tree.rootAdded'))
    } catch (err) {
      message.error(formatError(err, 'tree.createFailed'))
    }
  }

  const handleCreateChild = async (): Promise<void> => {
    const title = childTitle.trim()
    if (!title) {
      message.warning(t('chat.taskTitleRequired'))
      return
    }
    const titleErr = validateTaskTitle(childTitle)
    if (titleErr) {
      message.warning(taskValidationMessage(t, titleErr))
      return
    }
    if (!gid || !selectedParentId) return
    try {
      await createTask({ groupId: gid, title, parentTaskId: selectedParentId })
      setChildTitle('')
      setExpandedKeys((keys) =>
        keys.includes(selectedParentId) ? keys : [...keys, selectedParentId]
      )
      message.success(t('tree.childAdded'))
    } catch (err) {
      message.error(formatError(err, 'tree.createFailed'))
    }
  }

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <ViewToolbarGroup>
            <ViewToolbarPair>
              <Input
                placeholder={t('tree.rootPlaceholder')}
                value={newRootTitle}
                maxLength={TASK_TITLE_MAX_LENGTH}
                onChange={(e) => setNewRootTitle(e.target.value)}
                onPressEnter={() => void handleCreateRoot()}
                style={{ width: 220, maxWidth: 'min(280px, 42vw)' }}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={() => void handleCreateRoot()}>
                {t('tree.rootBtn')}
              </Button>
            </ViewToolbarPair>
            <ViewToolbarPair>
              <Input
                placeholder={t('tree.childPlaceholder')}
                value={childTitle}
                maxLength={TASK_TITLE_MAX_LENGTH}
                onChange={(e) => setChildTitle(e.target.value)}
                onPressEnter={() => void handleCreateChild()}
                disabled={!selectedParentId}
                style={{ width: 220, maxWidth: 'min(280px, 42vw)' }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                disabled={!selectedParentId}
                onClick={() => void handleCreateChild()}
              >
                {t('tree.addChild')}
              </Button>
            </ViewToolbarPair>
          </ViewToolbarGroup>
        }
        end={
          <>
            <ViewToolbarHint>{t('tree.progressHint')}</ViewToolbarHint>
            <ViewCrossLink onClick={() => navigate(groupViewPath(gid, 'board'))}>
              {t('tree.boardViewLink')}
            </ViewCrossLink>
          </>
        }
      />

      {parentSelected && (
        <Alert type="info" showIcon message={t('tree.parentProgressHint')} className={styles.parentHint} />
      )}

      <div className={styles.body}>
        <div className={styles.treeWrap}>
          {loading && tasks.length === 0 ? (
            <ViewLoadingCenter />
          ) : treeData.length === 0 ? (
            <ViewEmptyHint>{t('tree.empty')}</ViewEmptyHint>
          ) : (
            <Tree
              blockNode
              className={styles.tree}
              showLine
              expandedKeys={expandedKeys}
              onExpand={(keys) => setExpandedKeys(keys as string[])}
              treeData={treeData}
              onSelect={onSelect}
              selectedKeys={selectedTaskId ? [selectedTaskId] : []}
              defaultExpandAll={false}
            />
          )}
        </div>
        <aside className={styles.detailPanel}>
          {selectedTask ? (
            <TaskDetailPanel
              groupId={gid}
              task={selectedTask}
              tasks={tasks}
              onClose={() => {
                setSelectedTaskId(null)
                setSelectedParentId(null)
                setParentSelected(false)
              }}
              onSave={handleDetailSave}
              onDelete={handleDetailDelete}
              onLocateTask={locateTask}
            />
          ) : (
            <div className={styles.detailPanelPlaceholder}>
              <Text type="secondary">{t('tree.selectToViewDetail')}</Text>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

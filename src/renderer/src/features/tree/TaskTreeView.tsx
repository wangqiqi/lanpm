import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Input, Progress, Slider, Tree } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { DataNode } from 'antd/es/tree'
import { PlusOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import type { Task } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import ViewToolbar, { ViewToolbarGroup, ViewToolbarHint } from '@renderer/ui/ViewToolbar'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { ancestorKeysForTask, useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './tree.module.css'

function buildTreeData(
  tasks: Task[],
  isTaskHighlighted: (taskId: string) => boolean,
  inlineEditTaskId: string | null,
  onStartInlineEdit: (taskId: string) => void,
  onInlineProgressCommit: (taskId: string, value: number) => void
): DataNode[] {
  const byParent = new Map<string | undefined, Task[]>()
  for (const t of tasks) {
    const key = t.parentTaskId ?? '__root__'
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
      return {
        key: task.taskId,
        title: (
          <div
            className={`${styles.nodeRow} ${isTaskHighlighted(task.taskId) ? styles.searchHighlight : ''}`}
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
                  status={task.status === 'done' ? 'success' : 'active'}
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
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasksByGroup[gid] ?? [])
  const loading = useTaskStore((s) => s.loading[gid])
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const createTask = useTaskStore((s) => s.createTask)
  const updateTask = useTaskStore((s) => s.updateTask)

  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [newRootTitle, setNewRootTitle] = useState('')
  const [childTitle, setChildTitle] = useState('')
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [inlineEditTaskId, setInlineEditTaskId] = useState<string | null>(null)
  const [parentSelected, setParentSelected] = useState(false)

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
        message.error(err instanceof Error ? err.message : t('tree.updateFailed'))
      }
    },
    [updateTask, t]
  )

  const treeData = useMemo(
    () =>
      buildTreeData(
        tasks,
        isTaskHighlighted,
        inlineEditTaskId,
        (taskId) => setInlineEditTaskId(taskId),
        (taskId, value) => void commitInlineProgress(taskId, value)
      ),
    [tasks, isTaskHighlighted, inlineEditTaskId, commitInlineProgress]
  )

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
  }, [highlightId, tasks])

  const onSelect = useCallback(
    (keys: React.Key[]) => {
      const id = keys[0]
      if (typeof id !== 'string') {
        setParentSelected(false)
        setInlineEditTaskId(null)
        return
      }
      setSelectedParentId(id)
      const task = tasks.find((t) => t.taskId === id)
      if (task) {
        const hasChildren = tasks.some((t) => t.parentTaskId === id)
        setParentSelected(hasChildren)
        if (hasChildren) setInlineEditTaskId(null)
      }
    },
    [tasks]
  )

  const handleCreateRoot = async (): Promise<void> => {
    const title = newRootTitle.trim()
    if (!title || !gid) return
    try {
      await createTask({ groupId: gid, title })
      setNewRootTitle('')
      message.success(t('tree.rootAdded'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('tree.createFailed'))
    }
  }

  const handleCreateChild = async (): Promise<void> => {
    const title = childTitle.trim()
    if (!title || !gid || !selectedParentId) return
    try {
      await createTask({ groupId: gid, title, parentTaskId: selectedParentId })
      setChildTitle('')
      setExpandedKeys((keys) =>
        keys.includes(selectedParentId) ? keys : [...keys, selectedParentId]
      )
      message.success(t('tree.childAdded'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('tree.createFailed'))
    }
  }

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <ViewToolbarGroup>
            <Input
              placeholder={t('tree.rootPlaceholder')}
              value={newRootTitle}
              onChange={(e) => setNewRootTitle(e.target.value)}
              onPressEnter={() => void handleCreateRoot()}
              style={{ maxWidth: 280 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => void handleCreateRoot()}>
              {t('tree.rootBtn')}
            </Button>
            <Input
              placeholder={t('tree.childPlaceholder')}
              value={childTitle}
              onChange={(e) => setChildTitle(e.target.value)}
              disabled={!selectedParentId}
              style={{ maxWidth: 280 }}
            />
            <Button disabled={!selectedParentId} onClick={() => void handleCreateChild()}>
              {t('tree.addChild')}
            </Button>
          </ViewToolbarGroup>
        }
        end={
          <>
            <ViewToolbarHint>{t('tree.progressHint')}</ViewToolbarHint>
            <Button type="link" onClick={() => navigate(groupViewPath(gid, 'board'))}>
              {t('tree.boardViewLink')}
            </Button>
          </>
        }
      />

      {parentSelected && (
        <Alert type="info" showIcon message={t('tree.parentProgressHint')} className={styles.parentHint} />
      )}

      <div className={styles.treeWrap}>
        {loading && tasks.length === 0 ? (
          <ViewLoadingCenter />
        ) : treeData.length === 0 ? (
          <ViewEmptyHint>{t('tree.empty')}</ViewEmptyHint>
        ) : (
          <Tree
            showLine
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            treeData={treeData}
            onSelect={onSelect}
            defaultExpandAll={false}
          />
        )}
      </div>
    </div>
  )
}

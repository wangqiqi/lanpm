import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Input, InputNumber, Progress, Tree, message } from 'antd'
import type { DataNode } from 'antd/es/tree'
import { PlusOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import type { Task } from '@shared/task/types'
import { useTaskStore } from '@renderer/stores/taskStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import ViewToolbar, { ViewToolbarGroup } from '@renderer/ui/ViewToolbar'
import { ViewEmptyHint, ViewLoadingCenter } from '@renderer/ui/ViewState'
import styles from './tree.module.css'

function buildTreeData(tasks: Task[]): DataNode[] {
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
      return {
        key: task.taskId,
        title: (
          <div className={styles.nodeRow}>
            <span className={styles.nodeTitle}>{task.title}</span>
            <div className={styles.nodeProgress}>
              <Progress
                percent={task.progressPercent}
                size="small"
                status={task.status === 'done' ? 'success' : 'active'}
              />
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
  const [editingProgress, setEditingProgress] = useState<{
    taskId: string
    value: number
  } | null>(null)

  const treeData = useMemo(() => buildTreeData(tasks), [tasks])

  useEffect(() => {
    if (!gid) return
    void loadTasks(gid)
    const unsub = getLanpmApi().task.onTasksChanged((changedGroupId) => {
      if (changedGroupId === gid) void loadTasks(gid)
    })
    return unsub
  }, [gid, loadTasks])

  const onSelect = useCallback((keys: React.Key[]) => {
    const id = keys[0]
    if (typeof id === 'string') {
      setSelectedParentId(id)
      const task = tasks.find((t) => t.taskId === id)
      if (task) {
        const hasChildren = tasks.some((t) => t.parentTaskId === id)
        if (!hasChildren) {
          setEditingProgress({ taskId: id, value: task.progressPercent })
        } else {
          setEditingProgress(null)
        }
      }
    }
  }, [tasks])

  const handleCreateRoot = async (): Promise<void> => {
    const title = newRootTitle.trim()
    if (!title || !gid) return
    try {
      await createTask({ groupId: gid, title })
      setNewRootTitle('')
      message.success('已添加根任务')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
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
      message.success('已添加子任务')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '创建失败')
    }
  }

  const saveProgress = async (): Promise<void> => {
    if (!editingProgress) return
    try {
      await updateTask({
        taskId: editingProgress.taskId,
        progressPercent: Math.min(100, Math.max(0, editingProgress.value))
      })
      message.success('进度已更新')
      setEditingProgress(null)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新失败')
    }
  }

  return (
    <div className={styles.root}>
      <ViewToolbar
        start={
          <ViewToolbarGroup>
            <Input
              placeholder="新建根任务标题"
              value={newRootTitle}
              onChange={(e) => setNewRootTitle(e.target.value)}
              onPressEnter={() => void handleCreateRoot()}
              style={{ maxWidth: 280 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => void handleCreateRoot()}>
              根任务
            </Button>
            <Input
              placeholder="子任务标题（先选中父节点）"
              value={childTitle}
              onChange={(e) => setChildTitle(e.target.value)}
              disabled={!selectedParentId}
              style={{ maxWidth: 280 }}
            />
            <Button disabled={!selectedParentId} onClick={() => void handleCreateChild()}>
              添加子任务
            </Button>
          </ViewToolbarGroup>
        }
        end={
          <Button type="link" onClick={() => navigate(groupViewPath(gid, 'board'))}>
            看板视图
          </Button>
        }
      />

      {editingProgress && (
        <ViewToolbar>
          <ViewToolbarGroup>
            <span>叶子任务进度：</span>
            <InputNumber
              min={0}
              max={100}
              value={editingProgress.value}
              onChange={(v) =>
                setEditingProgress((s) => (s ? { ...s, value: Number(v ?? 0) } : s))
              }
            />
            <Button type="primary" size="small" onClick={() => void saveProgress()}>
              保存
            </Button>
          </ViewToolbarGroup>
        </ViewToolbar>
      )}

      <div className={styles.treeWrap}>
        {loading && tasks.length === 0 ? (
          <ViewLoadingCenter />
        ) : treeData.length === 0 ? (
          <ViewEmptyHint>暂无任务，可在看板或此处创建</ViewEmptyHint>
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

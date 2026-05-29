import { useEffect, useMemo, useState } from 'react'
import { Button, Input, Popconfirm, Select, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import styles from './tree.module.css'

const { Text } = Typography
const { TextArea } = Input

const STATUS_KEYS: Record<TaskStatus, MessageKey> = {
  todo: 'board.columnTodo',
  doing: 'board.columnDoing',
  done: 'board.columnDone',
  other: 'board.columnOther'
}

const PRIORITY_KEYS: Record<TaskPriority, MessageKey> = {
  low: 'board.priorityLow',
  medium: 'board.priorityMedium',
  high: 'board.priorityHigh'
}

interface TaskDetailPanelProps {
  groupId: string
  task: Task
  tasks: Task[]
  onClose: () => void
  onSave: (input: {
    taskId: string
    title: string
    description: string
    status: TaskStatus
    priority: TaskPriority
    assigneeUserId: string | null
    endDate: string | null
  }) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export default function TaskDetailPanel({
  groupId,
  task,
  tasks,
  onClose,
  onSave,
  onDelete
}: TaskDetailPanelProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const members = useChatMembersStore((s) => s.membersByGroup[groupId] ?? [])
  const getMemberDisplayName = useChatMembersStore((s) => s.getMemberDisplayName)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assigneeUserId, setAssigneeUserId] = useState<string | undefined>(
    task.assigneeUserId
  )
  const [endDate, setEndDate] = useState(task.endDate ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setPriority(task.priority)
    setAssigneeUserId(task.assigneeUserId)
    setEndDate(task.endDate ?? '')
  }, [task])

  const children = useMemo(
    () => tasks.filter((t) => t.parentTaskId === task.taskId),
    [tasks, task.taskId]
  )
  const childrenDone = children.filter((t) => t.status === 'done').length

  const memberOptions = useMemo(
    () => [
      { value: '', label: t('tree.detailUnassigned') },
      ...members.map((m) => ({ value: m.userId, label: m.displayName }))
    ],
    [members, t]
  )

  const handleSave = async (): Promise<void> => {
    const trimmed = title.trim()
    if (!trimmed) {
      message.warning(t('tree.detailTitleRequired'))
      return
    }
    setSaving(true)
    try {
      await onSave({
        taskId: task.taskId,
        title: trimmed,
        description: description.trim(),
        status,
        priority,
        assigneeUserId: assigneeUserId || null,
        endDate: endDate.trim() || null
      })
      message.success(t('tree.detailSaved'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('tree.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <aside className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        <Text strong>{t('tree.detailTitle')}</Text>
        <Button type="text" size="small" onClick={onClose}>
          {t('tree.detailClose')}
        </Button>
      </div>

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailName')}</Text>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailAssignee')}</Text>
        <Select
          value={assigneeUserId ?? ''}
          onChange={(v) => setAssigneeUserId(v || undefined)}
          options={memberOptions}
          style={{ width: '100%' }}
        />
      </label>

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailStatus')}</Text>
        <Select
          value={status}
          onChange={setStatus}
          options={KANBAN_COLUMN_ORDER.map((s) => ({ value: s, label: t(STATUS_KEYS[s]) }))}
          style={{ width: '100%' }}
        />
      </label>

      <label className={styles.detailField}>
        <Text type="secondary">{t('common.priority')}</Text>
        <Select
          value={priority}
          onChange={setPriority}
          options={(['low', 'medium', 'high'] as const).map((p) => ({
            value: p,
            label: t(PRIORITY_KEYS[p])
          }))}
          style={{ width: '100%' }}
        />
      </label>

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailEndDate')}</Text>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailDescription')}</Text>
        <TextArea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <Text type="secondary" className={styles.detailMeta}>
        {children.length > 0
          ? t('tree.detailChildren', { done: childrenDone, total: children.length })
          : t('tree.detailNoChildren')}
        {task.assigneeUserId && (
          <>
            {' · '}
            {getMemberDisplayName(groupId, task.assigneeUserId)}
          </>
        )}
      </Text>

      <div className={styles.detailActions}>
        <Button type="primary" loading={saving} onClick={() => void handleSave()}>
          {t('common.save')}
        </Button>
        <Popconfirm
          title={t('board.deleteConfirmTitle')}
          description={t('board.deleteConfirmDesc')}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          onConfirm={() => void onDelete(task.taskId)}
        >
          <Button danger>{t('common.delete')}</Button>
        </Popconfirm>
      </div>
    </aside>
  )
}

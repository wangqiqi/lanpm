import { useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Input, InputNumber, Select, Typography } from 'antd'
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

export interface TaskDetailSaveInput {
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
}

interface TaskDetailPanelProps {
  groupId: string
  task: Task
  tasks: Task[]
  onClose: () => void
  onSave: (input: TaskDetailSaveInput) => Promise<void>
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
  const [otherReason, setOtherReason] = useState(task.otherReason ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [assigneeUserId, setAssigneeUserId] = useState<string | undefined>(
    task.assigneeUserId
  )
  const [startDate, setStartDate] = useState(task.startDate ?? '')
  const [endDate, setEndDate] = useState(task.endDate ?? '')
  const [progressPercent, setProgressPercent] = useState(task.progressPercent)
  const [milestone, setMilestone] = useState(!!task.milestone)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setOtherReason(task.otherReason ?? '')
    setPriority(task.priority)
    setAssigneeUserId(task.assigneeUserId)
    setStartDate(task.startDate ?? '')
    setEndDate(task.endDate ?? '')
    setProgressPercent(task.progressPercent)
    setMilestone(!!task.milestone)
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
    if (status === 'other' && !otherReason.trim()) {
      message.warning(t('board.otherReasonRequired'))
      return
    }
    setSaving(true)
    try {
      await onSave({
        taskId: task.taskId,
        title: trimmed,
        description: description.trim(),
        status,
        otherReason: status === 'other' ? otherReason.trim() : null,
        priority,
        assigneeUserId: assigneeUserId || null,
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        progressPercent: Math.min(100, Math.max(0, progressPercent)),
        milestone
      })
      message.success(t('tree.detailSaved'))
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('tree.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveDisabled = !title.trim() || (status === 'other' && !otherReason.trim())

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

      {status === 'other' && (
        <label className={styles.detailField}>
          <Text type="secondary">{t('board.otherReasonLabel')}</Text>
          <TextArea
            rows={2}
            value={otherReason}
            onChange={(e) => setOtherReason(e.target.value)}
            placeholder={t('board.otherReasonPlaceholder')}
            maxLength={500}
          />
        </label>
      )}

      <label className={styles.detailField}>
        <Text type="secondary">{t('board.detailStartDate')}</Text>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailEndDate')}</Text>
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </label>

      <div className={styles.detailFieldRow}>
        <label className={styles.detailFieldGrow}>
          <Text type="secondary">{t('board.detailProgress')}</Text>
          <InputNumber
            min={0}
            max={100}
            value={progressPercent}
            onChange={(v) => setProgressPercent(typeof v === 'number' ? v : 0)}
            addonAfter="%"
            style={{ width: '100%' }}
          />
        </label>
        <Checkbox
          checked={milestone}
          onChange={(e) => setMilestone(e.target.checked)}
          className={styles.detailMilestone}
        >
          {t('board.milestone')}
        </Checkbox>
      </div>

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
        <Button
          type="primary"
          loading={saving}
          disabled={saveDisabled}
          onClick={() => void handleSave()}
        >
          {t('common.save')}
        </Button>
        <Button danger onClick={() => void onDelete(task.taskId)}>
          {t('common.delete')}
        </Button>
      </div>
    </aside>
  )
}

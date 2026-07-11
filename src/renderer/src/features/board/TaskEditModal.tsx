import { useEffect, useMemo, useState } from 'react'
import { Checkbox, Input, InputNumber, Modal, Select } from 'antd'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import type { TaskDetailSaveInput } from '@renderer/features/tree/TaskDetailPanel'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { onCtrlEnter, onEnterUnlessShift } from '@renderer/lib/inputKeyboard'
import { taskValidationMessage, TASK_TITLE_MAX_LENGTH } from '@renderer/features/task/taskValidationMessage'
import {
  clampProgressPercent,
  normalizeTaskDescription,
  normalizeOtherReason,
  normalizeTaskTitle,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_OTHER_REASON_MAX_LENGTH,
  validateTaskForm
} from '@shared/task/validation'
import { normalizeTaskTags, TASK_TAG_MAX_LENGTH, TASK_TAGS_MAX_COUNT } from '@shared/task/tags'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'

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

interface TaskEditModalProps {
  open: boolean
  groupId: string
  task: Task | null
  onCancel: () => void
  onSave: (input: TaskDetailSaveInput) => Promise<void>
}

export default function TaskEditModal({
  open,
  groupId,
  task,
  onCancel,
  onSave
}: TaskEditModalProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const members = useChatMembersStore((s) => s.membersByGroup[groupId] ?? [])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [otherReason, setOtherReason] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tags, setTags] = useState<string[]>([])
  const [assigneeUserId, setAssigneeUserId] = useState<string | undefined>()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [progressPercent, setProgressPercent] = useState(0)
  const [milestone, setMilestone] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setStatus(task.status)
    setOtherReason(task.otherReason ?? '')
    setPriority(task.priority)
    setTags(task.tags ?? [])
    setAssigneeUserId(task.assigneeUserId)
    setStartDate(task.startDate ?? '')
    setEndDate(task.endDate ?? '')
    setProgressPercent(task.progressPercent)
    setMilestone(!!task.milestone)
  }, [task])

  const memberOptions = useMemo(
    () => [
      { value: '', label: t('tree.detailUnassigned') },
      ...members.map((m) => ({ value: m.userId, label: m.displayName }))
    ],
    [members, t]
  )

  const okDisabled = !title.trim() || (status === 'other' && !otherReason.trim())

  const handleOk = async (): Promise<void> => {
    if (!task || okDisabled) return
    const formErr = validateTaskForm({
      title,
      status,
      otherReason,
      startDate: startDate.trim() || null,
      endDate: endDate.trim() || null
    })
    if (formErr) {
      message.warning(taskValidationMessage(t, formErr))
      return
    }

    setSaving(true)
    try {
      await onSave({
        taskId: task.taskId,
        title: normalizeTaskTitle(title),
        // 经 board → updateTask → updateGroupTask 双写 Y.Doc（TASK-162）
        description: normalizeTaskDescription(description),
        status,
        otherReason: status === 'other' ? normalizeOtherReason(otherReason) : null,
        priority,
        tags: normalizeTaskTags(tags),
        assigneeUserId: assigneeUserId || null,
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        progressPercent: clampProgressPercent(progressPercent),
        milestone
      })
      onCancel()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={t('board.editTitle')}
      open={open}
      destroyOnClose
      confirmLoading={saving}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      okButtonProps={{ disabled: okDisabled }}
      width={520}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
            {t('tree.detailName')}
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('board.taskTitlePlaceholder')}
            maxLength={TASK_TITLE_MAX_LENGTH}
            onPressEnter={() => {
              if (!okDisabled) void handleOk()
            }}
          />
        </label>

        <label>
          <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
            {t('tree.detailAssignee')}
          </div>
          <Select
            value={assigneeUserId ?? ''}
            onChange={(v) => setAssigneeUserId(v || undefined)}
            options={memberOptions}
            style={{ width: '100%' }}
          />
        </label>

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
              {t('tree.detailStatus')}
            </div>
            <Select
              value={status}
              onChange={setStatus}
              options={KANBAN_COLUMN_ORDER.map((s) => ({ value: s, label: t(STATUS_KEYS[s]) }))}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
              {t('common.priority')}
            </div>
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
        </div>

        <label>
          <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
            {t('board.tags')}
          </div>
          <Select
            mode="tags"
            value={tags}
            onChange={(next) => setTags(normalizeTaskTags(next))}
            tokenSeparators={[',']}
            placeholder={t('board.tagsPlaceholder')}
            maxTagCount={TASK_TAGS_MAX_COUNT}
            maxTagTextLength={TASK_TAG_MAX_LENGTH}
            style={{ width: '100%' }}
            open={false}
          />
          <div style={{ marginTop: 4, fontSize: 11, color: 'var(--lanpm-text-tertiary)' }}>
            {t('board.tagsHint')}
          </div>
        </label>

        {status === 'other' && (
          <label>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
              {t('board.otherReasonLabel')}
            </div>
            <TextArea
              rows={2}
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder={t('board.otherReasonPlaceholder')}
              maxLength={TASK_OTHER_REASON_MAX_LENGTH}
              onKeyDown={(e) => {
                if (!okDisabled) onEnterUnlessShift(e, () => void handleOk())
              }}
            />
          </label>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
              {t('board.detailStartDate')}
            </div>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
              {t('tree.detailEndDate')}
            </div>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              onPressEnter={() => {
                if (!okDisabled) void handleOk()
              }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ flex: 1 }}>
            <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
              {t('board.detailProgress')}
            </div>
            <InputNumber
              min={0}
              max={100}
              value={progressPercent}
              onChange={(v) => setProgressPercent(clampProgressPercent(v))}
              addonAfter="%"
              style={{ width: '100%' }}
            />
          </label>
          <Checkbox
            checked={milestone}
            onChange={(e) => setMilestone(e.target.checked)}
            style={{ marginBottom: 4, flexShrink: 0 }}
          >
            {t('board.milestone')}
          </Checkbox>
        </div>

        <label>
          <div style={{ marginBottom: 4, fontSize: 12, color: 'var(--lanpm-text-secondary)' }}>
            {t('tree.detailDescription')}
          </div>
          <TextArea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('tree.detailDescriptionPlaceholder')}
            maxLength={TASK_DESCRIPTION_MAX_LENGTH}
            onKeyDown={(e) => {
              if (!okDisabled) onCtrlEnter(e, () => void handleOk())
            }}
          />
        </label>
      </div>
    </Modal>
  )
}

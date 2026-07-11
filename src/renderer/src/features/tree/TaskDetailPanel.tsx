import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Input, InputNumber, Select, Slider, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import type { TaskDiscussionItem } from '@shared/task/discussions'
import type { ChatMessage } from '@shared/chat/types'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { useChatStore } from '@renderer/stores/chatStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import type { TranslateParams } from '@renderer/i18n/messages'
import {
  buildBoardRelationMap,
  listTaskPredecessors,
  listTaskSuccessors
} from '@shared/task/boardRelations'
import TaskRelationSection from '@renderer/features/task/TaskRelationSection'
import type { TaskLocateView } from '@renderer/features/task/useLocateTask'
import { taskFamilyStripeClass } from '@renderer/features/task/taskFamilyUi'
import {
  evaluateTaskSchedule,
  scheduleHealthAlertKey,
  treeProgressScheduleProps
} from '@renderer/features/task/scheduleHealthUi'
import { onCtrlEnter, onEnterUnlessShift, runOnEnter } from '@renderer/lib/inputKeyboard'
import {
  taskValidationMessage,
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH
} from '@renderer/features/task/taskValidationMessage'
import {
  clampProgressPercent,
  normalizeTaskDescription,
  normalizeOtherReason,
  normalizeTaskTitle,
  validateTaskForm
} from '@shared/task/validation'
import { filterTagsToGroupDict, TASK_TAGS_MAX_COUNT } from '@shared/task/tags'
import TaskTagChip from '@renderer/features/task/TaskTagChip'
import RemoteCaretOverlay from '@renderer/features/task/RemoteCaretOverlay'
import { useDescriptionCaretBroadcast } from '@renderer/features/task/useDescriptionCaretBroadcast'
import { useGroupTagStore } from '@renderer/stores/groupTagStore'
import { useTaskAwarenessStore } from '@renderer/stores/taskAwarenessStore'
import { groupTagMetaToColorMap } from '@shared/task/groupTagMeta'
import { whiteboardPathForTask } from '@renderer/features/whiteboard/whiteboardLink'
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
  tags: string[]
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
  onLocateTask: (taskId: string, view: TaskLocateView) => void
}

export default function TaskDetailPanel({
  groupId,
  task,
  tasks,
  onClose,
  onSave,
  onDelete,
  onLocateTask
}: TaskDetailPanelProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const members = useChatMembersStore((s) => s.membersByGroup[groupId] ?? [])
  const getMemberDisplayName = useChatMembersStore((s) => s.getMemberDisplayName)
  const tagMetaRows = useGroupTagStore((s) => s.byGroup[groupId] ?? [])
  const tagColorOverrides = useMemo(
    () => groupTagMetaToColorMap(tagMetaRows),
    [tagMetaRows]
  )
  const tagOptions = useMemo(
    () =>
      tagMetaRows.map((row) => ({
        value: row.label?.trim() || row.tagKey,
        label: row.label?.trim() || row.tagKey
      })),
    [tagMetaRows]
  )
  const dictEmpty = tagMetaRows.length === 0
  const ensureImported = useGroupTagStore((s) => s.ensureImported)
  const awarenessPeers = useTaskAwarenessStore((s) => s.byGroup[groupId] ?? [])
  const remoteCarets = useMemo(
    () =>
      awarenessPeers.filter(
        (p) =>
          p.focusedTaskId === task.taskId &&
          p.caret != null &&
          p.caret.field === 'description'
      ),
    [awarenessPeers, task.taskId]
  )
  const { publishCaret, clearCaret } = useDescriptionCaretBroadcast(
    groupId,
    task.taskId,
    'tree'
  )
  const descHostRef = useRef<HTMLDivElement>(null)
  const [descTextarea, setDescTextarea] = useState<HTMLTextAreaElement | null>(null)

  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [otherReason, setOtherReason] = useState(task.otherReason ?? '')
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [tags, setTags] = useState<string[]>(task.tags ?? [])
  const [assigneeUserId, setAssigneeUserId] = useState<string | undefined>(
    task.assigneeUserId
  )
  const [startDate, setStartDate] = useState(task.startDate ?? '')
  const [endDate, setEndDate] = useState(task.endDate ?? '')
  const [progressPercent, setProgressPercent] = useState(task.progressPercent)
  const [milestone, setMilestone] = useState(!!task.milestone)
  const [saving, setSaving] = useState(false)
  const [discussions, setDiscussions] = useState<TaskDiscussionItem[]>([])
  const [discussLoading, setDiscussLoading] = useState(false)
  const [fileNameById, setFileNameById] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false
    setDiscussLoading(true)
    void getLanpmApi()
      .task.listDiscussions(groupId, task.taskId)
      .then((items) => {
        if (!cancelled) setDiscussions(items)
      })
      .catch(() => {
        if (!cancelled) setDiscussions([])
      })
      .finally(() => {
        if (!cancelled) setDiscussLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId, task.taskId, task.sourceMsgId, task.updatedAt])

  useEffect(() => {
    const ids = task.linkedFileIds
    if (!ids || ids.length === 0) {
      setFileNameById({})
      return
    }
    let cancelled = false
    void getLanpmApi()
      .file.listFiles(groupId)
      .then((files) => {
        if (cancelled) return
        const map: Record<string, string> = {}
        for (const f of files) {
          if (ids.includes(f.fileId)) map[f.fileId] = f.name
        }
        setFileNameById(map)
      })
      .catch(() => {
        if (!cancelled) setFileNameById({})
      })
    return () => {
      cancelled = true
    }
  }, [groupId, task.linkedFileIds])

  const jumpToMessage = (msgId: string): void => {
    navigate(groupViewPath(groupId, 'chat'), { state: { highlightMsgId: msgId } })
    onClose()
  }

  const handleDiscussInChat = async (): Promise<void> => {
    try {
      const { message: chatMsg } = await getLanpmApi().task.referenceFromChat(
        groupId,
        task.taskId
      )
      useChatStore.getState().upsertMessage(chatMsg)
      navigate(groupViewPath(groupId, 'chat'), {
        state: {
          highlightMsgId: chatMsg.msgId,
          composeDraft: t('board.discussDraft', { title: task.title })
        }
      })
      onClose()
    } catch (err) {
      message.error(formatError(err, 'chat.taskRefFailed'))
    }
  }

  useEffect(() => {
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

  useEffect(() => {
    void ensureImported(groupId)
  }, [groupId, ensureImported])

  useEffect(() => {
    setDescTextarea(descHostRef.current?.querySelector('textarea') ?? null)
  }, [description, task.taskId])

  useEffect(() => {
    return () => clearCaret()
  }, [task.taskId, clearCaret])

  const scheduleDraft = useMemo(
    () => ({
      ...task,
      status,
      startDate: startDate.trim() || undefined,
      endDate: endDate.trim() || undefined,
      progressPercent,
      milestone
    }),
    [task, status, startDate, endDate, progressPercent, milestone]
  )
  const { health: scheduleHealth, expectedPercent } = evaluateTaskSchedule(scheduleDraft)
  const scheduleAlertKey = scheduleHealthAlertKey(scheduleHealth)
  const progressSchedule = treeProgressScheduleProps(scheduleHealth, status)

  const children = useMemo(
    () => tasks.filter((t) => t.parentTaskId === task.taskId),
    [tasks, task.taskId]
  )
  const childrenDone = children.filter((t) => t.status === 'done').length

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.taskId, t])), [tasks])
  const relation = useMemo(() => buildBoardRelationMap(tasks).get(task.taskId), [tasks, task.taskId])
  const predecessors = useMemo(
    () => listTaskPredecessors(task, tasksById),
    [task, tasksById]
  )
  const successors = useMemo(
    () => listTaskSuccessors(task.taskId, tasks),
    [task.taskId, tasks]
  )
  const familyStripe = relation ? taskFamilyStripeClass(relation.familyIndex) : undefined
  const parentTask = task.parentTaskId ? tasksById.get(task.parentTaskId) : undefined

  const memberOptions = useMemo(
    () => [
      { value: '', label: t('tree.detailUnassigned') },
      ...members.map((m) => ({ value: m.userId, label: m.displayName }))
    ],
    [members, t]
  )

  /**
   * 保存走 `task.updateTask` → main `updateGroupTask`：
   * SQLite 先写，再 `mirrorTaskToCrdt`（TASK-160/162 双写；无 Awareness）。
   */
  const handleSave = async (): Promise<void> => {
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
        description: normalizeTaskDescription(description),
        status,
        otherReason: status === 'other' ? normalizeOtherReason(otherReason) : null,
        priority,
        assigneeUserId: assigneeUserId || null,
        tags: filterTagsToGroupDict(tags, tagMetaRows),
        startDate: startDate.trim() || null,
        endDate: endDate.trim() || null,
        progressPercent: clampProgressPercent(progressPercent),
        milestone
      })
      message.success(t('tree.detailSaved'))
    } catch (err) {
      message.error(formatError(err, 'tree.updateFailed'))
    } finally {
      setSaving(false)
    }
  }

  const saveDisabled = !title.trim() || (status === 'other' && !otherReason.trim())
  const trySave = (): void => {
    if (saveDisabled || saving) return
    void handleSave()
  }

  return (
    <div className={`${styles.detailPanelBody} ${familyStripe ?? ''}`}>
      <div className={styles.detailHeader}>
        <Text strong>{t('tree.detailTitle')}</Text>
        <Button type="text" size="small" onClick={onClose}>
          {t('tree.detailClose')}
        </Button>
      </div>

      {parentTask && (
        <Text type="secondary" className={styles.detailBreadcrumb}>
          {t('board.relParent', { title: parentTask.title })}
        </Text>
      )}

      {scheduleAlertKey && expectedPercent != null && (
        <Alert
          type={scheduleHealth === 'overdue' ? 'error' : 'warning'}
          showIcon
          message={t(scheduleAlertKey, {
            expected: expectedPercent,
            current: progressPercent
          })}
        />
      )}

      <label className={styles.detailField}>
        <Text type="secondary">{t('tree.detailName')}</Text>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('board.taskTitlePlaceholder')}
          maxLength={TASK_TITLE_MAX_LENGTH}
          onPressEnter={runOnEnter(trySave, saveDisabled || saving)}
        />
      </label>

      <div className={styles.detailFieldRow}>
        <label className={styles.detailFieldGrow}>
          <Text type="secondary">{t('tree.detailAssignee')}</Text>
          <Select
            value={assigneeUserId ?? ''}
            onChange={(v) => setAssigneeUserId(v || undefined)}
            options={memberOptions}
            style={{ width: '100%' }}
          />
        </label>
        <label className={styles.detailFieldGrow}>
          <Text type="secondary">{t('tree.detailStatus')}</Text>
          <Select
            value={status}
            onChange={setStatus}
            options={KANBAN_COLUMN_ORDER.map((s) => ({ value: s, label: t(STATUS_KEYS[s]) }))}
            style={{ width: '100%' }}
          />
        </label>
        <label className={styles.detailFieldGrow}>
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
      </div>

      <label className={styles.detailField}>
        <Text type="secondary">{t('board.tags')}</Text>
        <Select
          mode="multiple"
          value={tags}
          onChange={(next) => setTags(filterTagsToGroupDict(next, tagMetaRows))}
          options={tagOptions}
          placeholder={
            dictEmpty ? t('board.tagsEmptyDictHint') : t('board.tagsPlaceholder')
          }
          maxTagCount={TASK_TAGS_MAX_COUNT}
          style={{ width: '100%' }}
          disabled={dictEmpty}
          showSearch
          optionFilterProp="label"
        />
        <Text type="secondary" style={{ fontSize: 11 }}>
          {dictEmpty ? t('board.tagsEmptyDictHint') : t('board.tagsHint')}
        </Text>
        {tags.length > 0 ? (
          <div className={styles.tagChipRow}>
            {tags.map((label) => (
              <TaskTagChip key={label} label={label} colorOverrides={tagColorOverrides} />
            ))}
          </div>
        ) : null}
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
            onKeyDown={(e) => onEnterUnlessShift(e, trySave, saveDisabled || saving)}
          />
        </label>
      )}

      <div className={styles.detailFieldRow}>
        <label className={styles.detailFieldGrow}>
          <Text type="secondary">{t('board.detailStartDate')}</Text>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className={styles.detailFieldGrow}>
          <Text type="secondary">{t('tree.detailEndDate')}</Text>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>

      <div className={styles.detailFieldRow}>
        <label className={styles.detailProgressField}>
          <Text type="secondary">{t('board.detailProgress')}</Text>
          <div className={styles.detailProgressControl}>
            <Slider
              min={0}
              max={100}
              value={progressPercent}
              onChange={(v) => setProgressPercent(clampProgressPercent(v))}
              className={styles.detailProgressSlider}
              trackStyle={
                progressSchedule.strokeColor
                  ? { background: progressSchedule.strokeColor }
                  : undefined
              }
            />
            <InputNumber
              min={0}
              max={100}
              size="small"
              controls={false}
              value={progressPercent}
              onChange={(v) => setProgressPercent(clampProgressPercent(v))}
              addonAfter="%"
              className={styles.detailProgressInput}
            />
          </div>
        </label>
        <Checkbox
          checked={milestone}
          onChange={(e) => setMilestone(e.target.checked)}
          className={styles.detailMilestone}
        >
          {t('board.milestone')}
        </Checkbox>
      </div>

      <label className={`${styles.detailField} ${styles.detailDescriptionField}`}>
        <Text type="secondary">{t('tree.detailDescription')}</Text>
        <div ref={descHostRef} className={styles.detailDescriptionHost}>
          <TextArea
            className={styles.detailDescriptionInput}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              publishCaret(e.target.selectionStart)
            }}
            onSelect={(e) => publishCaret(e.currentTarget.selectionStart)}
            onClick={(e) => publishCaret(e.currentTarget.selectionStart)}
            onKeyUp={(e) => publishCaret(e.currentTarget.selectionStart)}
            onBlur={() => clearCaret()}
            placeholder={t('tree.detailDescriptionPlaceholder')}
            maxLength={TASK_DESCRIPTION_MAX_LENGTH}
            onKeyDown={(e) => onCtrlEnter(e, trySave, saveDisabled || saving)}
          />
          <RemoteCaretOverlay
            text={description}
            textarea={descTextarea}
            carets={remoteCarets}
          />
        </div>
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

      <TaskRelationSection
        task={task}
        tasks={tasks}
        predecessors={predecessors}
        successors={successors}
        onLocate={onLocateTask}
      />

      <div className={styles.detailField}>
        <Text type="secondary">{t('tree.detailAttachments')}</Text>
        {!task.linkedFileIds || task.linkedFileIds.length === 0 ? (
          <Text type="secondary">{t('tree.detailAttachmentsEmpty')}</Text>
        ) : (
          <ul className={styles.discussionList}>
            {task.linkedFileIds.map((fileId) => (
              <li key={fileId}>
                <button
                  type="button"
                  className={styles.discussionItem}
                  onClick={() => {
                    navigate(groupViewPath(groupId, 'files'), {
                      state: { selectFileId: fileId }
                    })
                    onClose()
                  }}
                >
                  <span className={styles.discussionKind}>{t('tree.detailAttachmentFile')}</span>
                  <span className={styles.discussionPreview}>
                    {fileNameById[fileId] ?? fileId}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.detailField}>
        <Text type="secondary">{t('tree.detailDiscussions')}</Text>
        {discussLoading ? (
          <Text type="secondary">{t('common.loading')}</Text>
        ) : discussions.length === 0 ? (
          <Text type="secondary">{t('tree.detailDiscussionsEmpty')}</Text>
        ) : (
          <ul className={styles.discussionList}>
            {discussions.map((item) => (
              <li key={item.message.msgId}>
                <button
                  type="button"
                  className={styles.discussionItem}
                  onClick={() => jumpToMessage(item.message.msgId)}
                >
                  <span className={styles.discussionKind}>
                    {item.kind === 'source'
                      ? t('tree.detailDiscussionSource')
                      : t('tree.detailDiscussionRef')}
                  </span>
                  <span className={styles.discussionPreview}>
                    {discussionPreview(item.message, t)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.detailActions}>
        <Button
          type="primary"
          loading={saving}
          disabled={saveDisabled}
          onClick={() => void handleSave()}
        >
          {t('common.save')}
        </Button>
        <Button onClick={() => void handleDiscussInChat()}>{t('board.discussInChat')}</Button>
        <Button
          onClick={() => {
            navigate(whiteboardPathForTask(groupId, task.taskId))
            onClose()
          }}
        >
          {t('whiteboard.openFromTask')}
        </Button>
        <Button danger onClick={() => void onDelete(task.taskId)}>
          {t('common.delete')}
        </Button>
      </div>
    </div>
  )
}

function discussionPreview(
  message: ChatMessage,
  t: (key: MessageKey, params?: TranslateParams) => string
): string {
  const { content } = message
  if (content.kind === 'text') return content.text.slice(0, 80)
  if (content.kind === 'code') return content.code.split('\n')[0]?.slice(0, 80) ?? ''
  if (content.kind === 'file') return content.fileName
  if (content.kind === 'task_ref') return content.title
  return t('chat.unknownMessage', { type: message.type })
}

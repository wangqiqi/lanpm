import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Checkbox, Input, InputNumber, Select, Slider, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { Task, TaskPriority, TaskStatus } from '@shared/task/types'
import type { TaskDiscussionItem } from '@shared/task/discussions'
import type { ChecklistItem, ChecklistProgress } from '@shared/task/checklist'
import type { ChatMessage } from '@shared/chat/types'
import { KANBAN_COLUMN_ORDER } from '@shared/task/kanban'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { memberSelectFilterOption } from '@shared/chat/matchMemberSearch'
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
import PluginSlot from '@renderer/plugin/PluginSlot'
import { useAiAssistantStore } from '@renderer/stores/aiAssistantStore'
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
import { buildAssigneeNudgeDraft } from '@shared/task/dueNudge'
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
  const { message, modal } = useLanpmApp()
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
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>({
    done: 0,
    total: 0
  })
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [newChecklistText, setNewChecklistText] = useState('')
  const [checklistBusy, setChecklistBusy] = useState(false)

  const reloadChecklist = async (): Promise<void> => {
    const view = await getLanpmApi().task.listChecklist(groupId, task.taskId)
    setChecklistItems(view.items)
    setChecklistProgress(view.progress)
  }

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
    let cancelled = false
    setChecklistLoading(true)
    void getLanpmApi()
      .task.listChecklist(groupId, task.taskId)
      .then((view) => {
        if (cancelled) return
        setChecklistItems(view.items)
        setChecklistProgress(view.progress)
      })
      .catch(() => {
        if (cancelled) return
        setChecklistItems([])
        setChecklistProgress({ done: 0, total: 0 })
      })
      .finally(() => {
        if (!cancelled) setChecklistLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [groupId, task.taskId, task.updatedAt])

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

  const handleToggleChecklistItem = async (item: ChecklistItem): Promise<void> => {
    setChecklistBusy(true)
    try {
      await getLanpmApi().task.toggleChecklistItem(groupId, item.itemId, !item.done)
      await reloadChecklist()
    } catch (err) {
      message.error(formatError(err, 'stub.taskNotFound'))
    } finally {
      setChecklistBusy(false)
    }
  }

  const handleAddChecklistItem = async (): Promise<void> => {
    const text = newChecklistText.trim()
    if (!text || checklistBusy) return
    setChecklistBusy(true)
    try {
      await getLanpmApi().task.upsertChecklistItem({
        groupId,
        taskId: task.taskId,
        text
      })
      setNewChecklistText('')
      await reloadChecklist()
    } catch (err) {
      message.error(formatError(err, 'stub.taskNotFound'))
    } finally {
      setChecklistBusy(false)
    }
  }

  const handleRemoveChecklistItem = async (itemId: string): Promise<void> => {
    setChecklistBusy(true)
    try {
      await getLanpmApi().task.removeChecklistItem(groupId, itemId)
      await reloadChecklist()
    } catch (err) {
      message.error(formatError(err, 'stub.taskNotFound'))
    } finally {
      setChecklistBusy(false)
    }
  }

  const handleCreateSubtaskFromItem = async (item: ChecklistItem): Promise<void> => {
    if (item.done || checklistBusy) return
    setChecklistBusy(true)
    try {
      await getLanpmApi().task.createSubtaskFromChecklistItem(groupId, item.itemId)
      await reloadChecklist()
      message.success(t('tree.detailChecklistLinked'))
    } catch (err) {
      message.error(formatError(err, 'stub.taskNotFound'))
    } finally {
      setChecklistBusy(false)
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
            showSearch
            optionFilterProp="label"
            filterOption={(input, option) => memberSelectFilterOption(input, option, members)}
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

      <div className={styles.detailField}>
        <Button
          size="small"
          disabled={!assigneeUserId}
          onClick={() => {
            if (!assigneeUserId) {
              message.warning(t('task.nudgeNoAssignee'))
              return
            }
            const name = getMemberDisplayName(groupId, assigneeUserId) || assigneeUserId
            navigate(groupViewPath(groupId, 'chat'), {
              state: { composeDraft: buildAssigneeNudgeDraft(name) }
            })
          }}
        >
          {t('task.nudgeAssignee')}
        </Button>
        {!assigneeUserId ? (
          <Text type="secondary" style={{ marginLeft: 8 }}>
            {t('task.nudgeNoAssignee')}
          </Text>
        ) : null}
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
        <div className={styles.checklistHeader}>
          <Text type="secondary">{t('tree.detailChecklist')}</Text>
          {checklistProgress.total > 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {t('tree.detailChecklistProgress', {
                done: checklistProgress.done,
                total: checklistProgress.total
              })}
            </Text>
          ) : null}
        </div>
        {checklistProgress.total > 0 ? (
          <div className={styles.checklistProgressBar} aria-hidden>
            <div
              className={styles.checklistProgressFill}
              style={{
                width: `${Math.round(
                  (checklistProgress.done / checklistProgress.total) * 100
                )}%`
              }}
            />
          </div>
        ) : null}
        {checklistLoading ? (
          <Text type="secondary">{t('common.loading')}</Text>
        ) : checklistItems.length === 0 ? (
          <Text type="secondary">{t('tree.detailChecklistEmpty')}</Text>
        ) : (
          <ul className={styles.checklistList}>
            {checklistItems.map((item) => (
              <li key={item.itemId} className={styles.checklistRow}>
                <Checkbox
                  checked={item.done}
                  disabled={checklistBusy}
                  onChange={() => void handleToggleChecklistItem(item)}
                />
                <span
                  className={`${styles.checklistText}${
                    item.done ? ` ${styles.checklistTextDone}` : ''
                  }`}
                >
                  {item.text}
                </span>
                {!item.done && !item.linkedSubtaskId ? (
                  <Button
                    type="link"
                    size="small"
                    disabled={checklistBusy}
                    onClick={() => void handleCreateSubtaskFromItem(item)}
                  >
                    {t('tree.detailChecklistCreateSubtask')}
                  </Button>
                ) : null}
                {item.linkedSubtaskId ? (
                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                    {t('tree.detailChecklistLinked')}
                  </Text>
                ) : null}
                <Button
                  type="link"
                  size="small"
                  danger
                  disabled={checklistBusy}
                  onClick={() => void handleRemoveChecklistItem(item.itemId)}
                >
                  {t('tree.detailChecklistRemove')}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.checklistAddRow}>
          <Input
            value={newChecklistText}
            onChange={(e) => setNewChecklistText(e.target.value)}
            placeholder={t('tree.detailChecklistPlaceholder')}
            maxLength={200}
            disabled={checklistBusy}
            onPressEnter={runOnEnter(() => void handleAddChecklistItem(), checklistBusy)}
          />
          <Button
            type="default"
            disabled={checklistBusy || !newChecklistText.trim()}
            loading={checklistBusy}
            onClick={() => void handleAddChecklistItem()}
          >
            {t('tree.detailChecklistAdd')}
          </Button>
        </div>
      </div>

      <div className={styles.detailField}>
        <Text type="secondary">{t('ai.taskSectionTitle')}</Text>
        <div className={styles.checklistAddRow}>
          <Button
            type="default"
            onClick={() =>
              useAiAssistantStore.getState().openAssistant({
                groupId,
                composerPrefill: `#${task.title} `,
                context: { taskId: task.taskId },
                layout: window.matchMedia('(min-width: 1100px)').matches ? 'dock' : 'drawer'
              })
            }
          >
            {t('ai.askAboutTask')}
          </Button>
          <Button
            type="default"
            onClick={() => {
              void (async () => {
                try {
                  const result = await getLanpmApi().ai.reviewTask({
                    groupId,
                    taskId: task.taskId
                  })
                  modal.info({
                    title: t('ai.reviewTask'),
                    content: (
                      <div>
                        <p>{result.summary}</p>
                        {result.risks.length ? (
                          <ul>
                            {result.risks.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        ) : null}
                        {result.suggestions.length ? (
                          <ul>
                            {result.suggestions.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ),
                    okText: t('common.confirm')
                  })
                } catch (err) {
                  message.error(formatError(err, 'ai.sendFailed'))
                }
              })()
            }}
          >
            {t('ai.reviewTask')}
          </Button>
        </div>
      </div>

      <PluginSlot slotId="task.detail.section" groupId={groupId} taskId={task.taskId} />

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

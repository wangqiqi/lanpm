import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Drawer, Input, List, Space, Typography } from 'antd'
import {
  CloseOutlined,
  ExpandOutlined,
  RobotOutlined,
  SendOutlined,
  ShareAltOutlined
} from '@ant-design/icons'
import type { AiGateStatus, AiMessage, AiThread } from '@shared/ai/types'
import { activeComposerSuggest, filterTasksByQuery } from '@shared/chat/taskRefs'
import type { Task } from '@shared/task/types'
import { useMediaQuery } from '@renderer/hooks/useMediaQuery'
import { useI18n } from '@renderer/i18n/useI18n'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ComposerIconButton from '@renderer/ui/ComposerIconButton'
import AiMessageRow from '@renderer/features/ai/AiMessageRow'
import AiPromptRail from '@renderer/features/ai/AiPromptRail'
import SubtaskPreviewModal, {
  proposalsToRows,
  type SubtaskPreviewRow
} from '@renderer/features/ai/SubtaskPreviewModal'
import { useAiAssistantStore } from '@renderer/stores/aiAssistantStore'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useTaskStore } from '@renderer/stores/taskStore'
import { resolveAssistantTaskId } from '@shared/ai/resolveAssistantTaskId'
import styles from './aiAssistant.module.css'

const { Text } = Typography
const { TextArea } = Input

function pickLayout(
  wideDock: boolean,
  mediumDrawer: boolean,
  forced: 'dock' | 'drawer' | 'fullscreen' | null
): 'dock' | 'drawer' | 'fullscreen' {
  if (forced === 'fullscreen') return 'fullscreen'
  if (forced === 'dock' && wideDock) return 'dock'
  if (!mediumDrawer) return 'fullscreen'
  if (wideDock && forced !== 'drawer') return 'dock'
  return 'drawer'
}

export default function AiAssistantShell(): React.ReactElement | null {
  const { t, formatError, locale } = useI18n()
  const { message } = useLanpmApp()
  const open = useAiAssistantStore((s) => s.open)
  const closeAssistant = useAiAssistantStore((s) => s.closeAssistant)
  const groupId = useAiAssistantStore((s) => s.groupId)
  const threadId = useAiAssistantStore((s) => s.threadId)
  const setThreadId = useAiAssistantStore((s) => s.setThreadId)
  const context = useAiAssistantStore((s) => s.context)
  const composerPrefill = useAiAssistantStore((s) => s.composerPrefill)
  const forcedLayout = useAiAssistantStore((s) => s.layout)
  const setLayout = useAiAssistantStore((s) => s.setLayout)
  const entrySource = useAiAssistantStore((s) => s.entrySource)
  const location = useLocation()
  const appView = useMemo(() => {
    const match = /\/g\/[^/]+\/([^/?]+)/.exec(location.pathname)
    if (match?.[1]) return match[1]
    if (location.pathname.includes('/cockpit')) return 'cockpit'
    return null
  }, [location.pathname])
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const effectiveGroupId = groupId ?? activeGroupId ?? null
  const loadTasks = useTaskStore((s) => s.loadTasks)
  const tasks = useTaskStore((s) =>
    effectiveGroupId ? (s.tasksByGroup[effectiveGroupId] ?? []) : []
  )
  const loadMembers = useChatMembersStore((s) => s.loadMembers)
  const members = useChatMembersStore((s) =>
    effectiveGroupId ? (s.membersByGroup[effectiveGroupId] ?? []) : []
  )

  const wideDock = useMediaQuery('(min-width: 1100px)')
  const mediumDrawer = useMediaQuery('(min-width: 900px)')
  const layout = pickLayout(wideDock, mediumDrawer, open ? forcedLayout : null)

  const [gate, setGate] = useState<AiGateStatus | null>(null)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [threads, setThreads] = useState<AiThread[]>([])
  const [messages, setMessages] = useState<AiMessage[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false)
  const [subtaskLoading, setSubtaskLoading] = useState(false)
  const [subtaskConfirming, setSubtaskConfirming] = useState(false)
  const [subtaskRows, setSubtaskRows] = useState<SubtaskPreviewRow[]>([])
  const [subtaskUsedExternalAi, setSubtaskUsedExternalAi] = useState(false)
  const [subtaskDegraded, setSubtaskDegraded] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const canSend = Boolean(gate?.canStream && online && !streaming)
  const promptLayout = wideDock && layout === 'fullscreen' ? 'rail' : 'chips'

  const aiApi = open ? getLanpmApi().ai : null
  const apiMissing = open && !aiApi

  const refreshGate = useCallback(async () => {
    if (!getLanpmApi().ai) return
    const status = await getLanpmApi().ai!.getGateStatus()
    setGate(status)
  }, [])

  const refreshThreads = useCallback(async () => {
    if (!getLanpmApi().ai) return
    const list = await getLanpmApi().ai!.listThreads(
      effectiveGroupId ? { groupId: effectiveGroupId } : {}
    )
    setThreads(list)
  }, [effectiveGroupId])

  const loadThread = useCallback(
    async (id: string) => {
      if (!getLanpmApi().ai) return
      const data = await getLanpmApi().ai!.getThread(id)
      setThreadId(id)
      setMessages(data.messages)
    },
    [setThreadId]
  )

  useEffect(() => {
    if (!open) return
    if (effectiveGroupId) {
      void loadTasks(effectiveGroupId)
      void loadMembers(effectiveGroupId)
    }
    void refreshGate()
    void refreshThreads()
    if (composerPrefill) setDraft(composerPrefill)
    if (threadId) void loadThread(threadId)
  }, [open, composerPrefill, threadId, effectiveGroupId, loadTasks, loadMembers, refreshGate, refreshThreads, loadThread])

  const memberOptions = useMemo(
    () => [
      { value: '', label: t('tree.detailUnassigned') },
      ...members.map((m) => ({ value: m.userId, label: m.displayName }))
    ],
    [members, t]
  )

  const resolvedTaskId = useMemo(
    () =>
      effectiveGroupId
        ? resolveAssistantTaskId(context?.taskId, draft, tasks as Task[])
        : null,
    [context?.taskId, draft, tasks, effectiveGroupId]
  )

  useEffect(() => {
    const onOnline = (): void => setOnline(true)
    const onOffline = (): void => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const aiApi = getLanpmApi().ai
    if (!aiApi?.onStreamChunk) return
    const unsubChunk = aiApi.onStreamChunk(({ requestId, delta }) => {
      if (requestIdRef.current !== requestId) return
      setStreamBuffer((prev) => prev + delta)
    })
    const unsubDone = aiApi.onStreamDone(({ requestId, threadId: tid, assistantText }) => {
      if (requestIdRef.current !== requestId) return
      requestIdRef.current = null
      setStreaming(false)
      setStreamBuffer('')
      setThreadId(tid)
      void loadThread(tid)
      void refreshThreads()
      if (!assistantText) return
    })
    const unsubErr = aiApi.onStreamError(({ requestId, message: errMsg }) => {
      if (requestIdRef.current !== requestId) return
      requestIdRef.current = null
      setStreaming(false)
      setStreamBuffer('')
      message.error(errMsg === 'AI_NOT_AVAILABLE' ? t('ai.gateUnavailable') : errMsg)
    })
    return () => {
      unsubChunk()
      unsubDone()
      unsubErr()
    }
  }, [open, loadThread, refreshThreads, setThreadId, message, t])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, streamBuffer])

  const suggestMode = useMemo(() => activeComposerSuggest(draft, tasks.length > 0), [draft, tasks.length])
  const taskSuggestions = useMemo(() => {
    if (suggestMode !== 'task') return []
    const match = /(?:^|\s)#([^#\n]*)$/.exec(draft)
    const q = match?.[1] ?? ''
    return filterTasksByQuery(tasks as Task[], q, 8)
  }, [draft, suggestMode, tasks])

  const insertTaskRef = (task: Task): void => {
    setDraft((prev) => {
      const replaced = prev.replace(/(?:^|\s)#([^#\n]*)$/, ` #${task.title} `)
      if (replaced !== prev) return replaced.trimStart()
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}#${task.title} `
    })
  }

  const exitSelectMode = useCallback((): void => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((messageId: string): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(messageId)) next.delete(messageId)
      else next.add(messageId)
      return next
    })
  }, [])

  const copyText = useCallback(
    async (text: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text)
        message.success(t('ai.copied'))
      } catch {
        message.error(t('ai.copyFailed'))
      }
    },
    [message, t]
  )

  const shouldShowAvatar = useCallback((index: number, role: AiMessage['role']): boolean => {
    if (index === 0) return true
    return messages[index - 1]?.role !== role
  }, [messages])

  const handleSend = useCallback(async (overrideText?: string): Promise<void> => {
    const text = (overrideText ?? draft).trim()
    if (!text || !canSend) return
    if (!overrideText) setDraft('')
    setStreaming(true)
    setStreamBuffer('')
    exitSelectMode()
    setMessages((prev) => [
      ...prev,
      {
        messageId: `local_${Date.now()}`,
        threadId: threadId ?? 'pending',
        role: 'user',
        content: text,
        createdAt: new Date().toISOString()
      }
    ])
    try {
      const { requestId } = await getLanpmApi().ai!.streamChat({
        threadId: threadId ?? undefined,
        groupId: effectiveGroupId,
        userMessage: text,
        context: context ?? undefined,
        createThreadTitle: text.slice(0, 40),
        entrySource,
        appView,
        locale,
        networkOnline: navigator.onLine
      })
      requestIdRef.current = requestId
    } catch (err) {
      setStreaming(false)
      message.error(formatError(err, 'ai.sendFailed'))
    }
  }, [
    draft,
    canSend,
    exitSelectMode,
    threadId,
    effectiveGroupId,
    context,
    entrySource,
    appView,
    locale,
    formatError,
    message
  ])

  const handleShare = useCallback(async (markdown?: string): Promise<void> => {
    if (!effectiveGroupId) {
      message.warning(t('ai.pickGroupHint'))
      return
    }
    const body =
      markdown ??
      [...messages]
        .reverse()
        .find((m) => m.role === 'assistant')
        ?.content ??
      streamBuffer
    if (!body.trim()) {
      message.warning(t('ai.nothingToShare'))
      return
    }
    try {
      await getLanpmApi().ai!.shareToChat({
        groupId: effectiveGroupId,
        markdown: body,
        threadId: threadId ?? undefined
      })
      message.success(t('ai.sharedToChat'))
    } catch (err) {
      message.error(formatError(err, 'ai.shareFailed'))
    }
  }, [effectiveGroupId, messages, streamBuffer, threadId, formatError, message, t])

  const handleCopySelected = useCallback(async (): Promise<void> => {
    const selected = messages.filter((m) => selectedIds.has(m.messageId))
    if (!selected.length) return
    const text = selected
      .map((m) => {
        const label = m.role === 'user' ? t('ai.you') : t('ai.assistantName')
        return `**${label}**: ${m.content}`
      })
      .join('\n\n')
    await copyText(text)
  }, [messages, selectedIds, copyText, t])

  const handleShareSelected = useCallback(async (): Promise<void> => {
    const selected = messages.filter((m) => selectedIds.has(m.messageId))
    if (!selected.length) return
    const markdown = selected
      .map((m) => {
        const label = m.role === 'user' ? t('ai.you') : t('ai.assistantName')
        return `**${label}**\n\n${m.content}`
      })
      .join('\n\n---\n\n')
    await handleShare(markdown)
    exitSelectMode()
  }, [messages, selectedIds, handleShare, exitSelectMode, t])

  const handleOpenSubtaskSplit = useCallback((): void => {
    if (!effectiveGroupId || !resolvedTaskId) return
    setSubtaskModalOpen(true)
    setSubtaskLoading(true)
    setSubtaskRows([])
    setSubtaskDegraded(false)
    void (async () => {
      try {
        const result = await getLanpmApi().ai!.proposeSubtasks({
          groupId: effectiveGroupId,
          parentTaskId: resolvedTaskId
        })
        setSubtaskRows(proposalsToRows(result.proposals))
        setSubtaskUsedExternalAi(result.usedExternalAi)
        setSubtaskDegraded(Boolean(result.errorCode))
      } catch (err) {
        message.error(formatError(err, 'ai.sendFailed'))
        setSubtaskModalOpen(false)
      } finally {
        setSubtaskLoading(false)
      }
    })()
  }, [effectiveGroupId, resolvedTaskId, formatError, message])

  const gateHint = !gate?.enabled
    ? t('ai.gateDisabled')
    : !gate?.hasApiKey
      ? t('ai.gateNoKey')
      : gate.endpointReachable === false
        ? t('ai.gateEndpointUnreachable')
        : !online
          ? t('ai.gateOffline')
          : null

  const body = (
    <div className={styles.shellInner}>
      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <RobotOutlined className={styles.headerIcon} aria-hidden />
          <span>{t('ai.title')}</span>
          <span className={styles.contextTag}>
            {effectiveGroupId ? t('ai.contextGroup') : t('ai.contextGlobal')}
          </span>
        </div>
        <Space size={4}>
          {resolvedTaskId ? (
            <Button type="text" size="small" disabled={!gate?.canStream} onClick={handleOpenSubtaskSplit}>
              {t('ai.splitSubtasks')}
            </Button>
          ) : null}
          {messages.length > 0 ? (
            <Button
              type="text"
              size="small"
              onClick={() => {
                if (selectMode) exitSelectMode()
                else setSelectMode(true)
              }}
            >
              {selectMode ? t('ai.cancelSelect') : t('ai.selectMode')}
            </Button>
          ) : null}
          {layout !== 'fullscreen' ? (
            <Button
              type="text"
              size="small"
              icon={<ExpandOutlined />}
              aria-label={t('ai.fullscreen')}
              onClick={() => setLayout('fullscreen')}
            />
          ) : null}
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={closeAssistant} />
        </Space>
      </header>

      <div className={styles.body}>
        <aside className={styles.threadList}>
          <Button
            type="default"
            block
            size="small"
            className={styles.newThreadBtn}
            onClick={() => {
              setThreadId(null)
              setMessages([])
              exitSelectMode()
            }}
          >
            {t('ai.newThread')}
          </Button>
          <List
            size="small"
            dataSource={threads}
            locale={{ emptyText: t('ai.noThreads') }}
            renderItem={(item) => (
              <List.Item
                className={item.threadId === threadId ? styles.threadActive : styles.threadItem}
                onClick={() => void loadThread(item.threadId)}
              >
                <Text ellipsis>{item.title || t('ai.untitledThread')}</Text>
              </List.Item>
            )}
          />
        </aside>

        <div className={styles.chatPane}>
          <div className={styles.chatMain}>
            <div className={styles.messages} ref={listRef}>
              {messages.map((m, index) => (
                <AiMessageRow
                  key={m.messageId}
                  message={m}
                  showAvatar={shouldShowAvatar(index, m.role)}
                  selectMode={selectMode}
                  selected={selectedIds.has(m.messageId)}
                  onToggleSelect={toggleSelect}
                />
              ))}
              {streamBuffer ? (
                <AiMessageRow
                  message={{
                    messageId: '__streaming__',
                    role: 'assistant',
                    content: streamBuffer,
                    createdAt: new Date().toISOString()
                  }}
                  showAvatar={
                    messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant'
                  }
                  selectMode={false}
                  selected={false}
                  onToggleSelect={() => {}}
                />
              ) : null}
            </div>

            {promptLayout === 'rail' ? (
              <AiPromptRail
                hasGroup={Boolean(effectiveGroupId)}
                layout="rail"
                disabled={!canSend}
                onSendPreset={(text) => void handleSend(text)}
              />
            ) : null}
          </div>

          {apiMissing ? (
            <Text className={`${styles.gateHint} ${styles.gateHintDanger}`}>
              {t('ai.apiUnavailable')}
            </Text>
          ) : null}
          {gateHint ? (
            <Text type="secondary" className={styles.gateHint}>
              {gateHint}
            </Text>
          ) : null}

          {taskSuggestions.length > 0 ? (
            <div className={styles.suggest}>
              {taskSuggestions.map((task) => (
                <button
                  key={task.taskId}
                  type="button"
                  className={styles.suggestItem}
                  onClick={() => insertTaskRef(task)}
                >
                  #{task.title}
                </button>
              ))}
            </div>
          ) : null}

          {promptLayout === 'chips' ? (
            <AiPromptRail
              hasGroup={Boolean(effectiveGroupId)}
              layout="chips"
              disabled={!canSend}
              onSendPreset={(text) => void handleSend(text)}
            />
          ) : null}

          {selectMode ? (
            <div className={styles.selectBar}>
              <Button
                size="small"
                disabled={selectedIds.size === 0}
                onClick={() => void handleCopySelected()}
              >
                {t('ai.copySelected')}
              </Button>
              <Button
                size="small"
                disabled={selectedIds.size === 0 || !effectiveGroupId}
                onClick={() => void handleShareSelected()}
              >
                {t('ai.shareSelected')}
              </Button>
              <Button size="small" type="text" onClick={exitSelectMode}>
                {t('ai.cancelSelect')}
              </Button>
            </div>
          ) : null}

          <div className={styles.composer}>
            <div className={styles.composerIsland}>
              <div className={styles.inputWrap}>
                <div className={styles.inputComposeRow}>
                  <TextArea
                    className={styles.inputTextarea}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t('ai.composerPlaceholder')}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    variant="borderless"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void handleSend()
                      }
                    }}
                    disabled={!canSend}
                  />
                  <ComposerIconButton
                    icon={<ShareAltOutlined />}
                    label={t('ai.sendToChat')}
                    className={styles.shareIconBtn}
                    disabled={!effectiveGroupId || (!messages.length && !streamBuffer)}
                    onClick={() => void handleShare()}
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<SendOutlined />}
                    className={styles.sendIconBtn}
                    loading={streaming}
                    disabled={!canSend || !draft.trim()}
                    aria-label={t('ai.send')}
                    title={t('ai.send')}
                    onClick={() => void handleSend()}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (!open) return null

  const subtaskModal = (
    <SubtaskPreviewModal
      open={subtaskModalOpen}
      loading={subtaskLoading}
      proposals={subtaskRows}
      memberOptions={memberOptions}
      usedExternalAi={subtaskUsedExternalAi}
      degraded={subtaskDegraded}
      onChange={setSubtaskRows}
      onCancel={() => setSubtaskModalOpen(false)}
      confirming={subtaskConfirming}
      onConfirm={(rows) => {
        if (!effectiveGroupId || !resolvedTaskId) return
        void (async () => {
          setSubtaskConfirming(true)
          try {
            const result = await getLanpmApi().ai!.confirmSubtasks({
              groupId: effectiveGroupId,
              parentTaskId: resolvedTaskId,
              items: rows.map((r) => ({
                title: r.title.trim(),
                assigneeUserId: r.suggestedAssigneeUserId,
                endDate: r.suggestedEndDate
              }))
            })
            message.success(t('ai.subtaskCreated', { count: String(result.createdTaskIds.length) }))
            setSubtaskModalOpen(false)
            if (effectiveGroupId) void loadTasks(effectiveGroupId)
          } catch (err) {
            message.error(formatError(err, 'ai.sendFailed'))
          } finally {
            setSubtaskConfirming(false)
          }
        })()
      }}
    />
  )

  if (layout === 'dock') {
    return (
      <>
        <aside className={styles.dock}>{body}</aside>
        {subtaskModal}
      </>
    )
  }

  return (
    <>
      <Drawer
        open={open}
        onClose={closeAssistant}
        width={layout === 'fullscreen' ? '100%' : 'min(420px, 85vw)'}
        className={styles.drawer}
        closable={false}
        mask={layout !== 'fullscreen'}
        placement="right"
        styles={{ body: { padding: 0 } }}
      >
        {body}
      </Drawer>
      {subtaskModal}
    </>
  )
}

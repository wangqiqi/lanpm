import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Drawer, Input, List, Space, Tag, Typography } from 'antd'
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
import { useAiAssistantStore } from '@renderer/stores/aiAssistantStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useTaskStore } from '@renderer/stores/taskStore'
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
  const requestIdRef = useRef<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const canSend = Boolean(gate?.canStream && online && !streaming)

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
    if (effectiveGroupId) void loadTasks(effectiveGroupId)
    void refreshGate()
    void refreshThreads()
    if (composerPrefill) setDraft(composerPrefill)
    if (threadId) void loadThread(threadId)
  }, [open, composerPrefill, threadId, effectiveGroupId, loadTasks, refreshGate, refreshThreads, loadThread])

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

  const handleSend = async (): Promise<void> => {
    const text = draft.trim()
    if (!text || !canSend) return
    setDraft('')
    setStreaming(true)
    setStreamBuffer('')
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
      const { requestId } = await getLanpmApi().ai.streamChat({
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
  }

  const handleShare = async (): Promise<void> => {
    if (!effectiveGroupId) {
      message.warning(t('ai.pickGroupHint'))
      return
    }
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    const body = lastAssistant?.content ?? streamBuffer
    if (!body.trim()) {
      message.warning(t('ai.nothingToShare'))
      return
    }
    try {
      await getLanpmApi().ai.shareToChat({
        groupId: effectiveGroupId,
        markdown: body,
        threadId: threadId ?? undefined
      })
      message.success(t('ai.sharedToChat'))
    } catch (err) {
      message.error(formatError(err, 'ai.shareFailed'))
    }
  }

  const gateHint = !gate?.enabled
    ? t('ai.gateDisabled')
    : !gate?.hasApiKey
      ? t('ai.gateNoKey')
      : !online
        ? t('ai.gateOffline')
        : null

  const body = (
    <div className={styles.shellInner}>
      <header className={styles.header}>
        <Space>
          <RobotOutlined />
          <Text strong>{t('ai.title')}</Text>
          {effectiveGroupId ? <Tag>{t('ai.contextGroup')}</Tag> : <Tag>{t('ai.contextGlobal')}</Tag>}
        </Space>
        <Space>
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
            type="dashed"
            block
            size="small"
            onClick={() => {
              setThreadId(null)
              setMessages([])
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
          <div className={styles.messages} ref={listRef}>
            {messages.map((m) => (
              <div
                key={m.messageId}
                className={m.role === 'user' ? styles.msgUser : styles.msgAssistant}
              >
                <pre className={styles.msgBody}>{m.content}</pre>
              </div>
            ))}
            {streamBuffer ? (
              <div className={styles.msgAssistant}>
                <pre className={styles.msgBody}>{streamBuffer}</pre>
              </div>
            ) : null}
          </div>

          {apiMissing ? (
            <Text type="danger" className={styles.gateHint}>
              {t('ai.apiUnavailable')}
            </Text>
          ) : null}
          {gateHint ? <Text type="secondary" className={styles.gateHint}>{gateHint}</Text> : null}

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

          <div className={styles.composer}>
            <TextArea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('ai.composerPlaceholder')}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              disabled={!canSend}
            />
            <Space className={styles.composerActions}>
              <Button
                icon={<ShareAltOutlined />}
                disabled={!effectiveGroupId || (!messages.length && !streamBuffer)}
                onClick={() => void handleShare()}
              >
                {t('ai.sendToChat')}
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={streaming}
                disabled={!canSend || !draft.trim()}
                onClick={() => void handleSend()}
              >
                {t('ai.send')}
              </Button>
            </Space>
          </div>
        </div>
      </div>
    </div>
  )

  if (!open) return null

  if (layout === 'dock') {
    return <aside className={styles.dock}>{body}</aside>
  }

  return (
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
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input, Segmented, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import {
  AudioOutlined,
  CameraOutlined,
  CodeOutlined,
  EditOutlined,
  MenuOutlined,
  PaperClipOutlined,
  PlusSquareOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { isDmGroupId } from '@shared/chat/dmSession'
import { parseTaskCommand } from '@shared/chat/taskCommand'
import { useChatStore } from '@renderer/stores/chatStore'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { deliveryStatusMeta, groupMessagesByDay } from '@renderer/features/chat/chatDateGroups'
import { useMentionSuggest } from '@renderer/features/chat/mentionKeyboard'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import CodeSendModal from '@renderer/features/chat/CodeSendModal'
import DmSessionBar from '@renderer/features/chat/DmSessionBar'
import MemberList from '@renderer/features/chat/MemberList'
import MentionSuggest from '@renderer/features/chat/MentionSuggest'
import MessageBubble from '@renderer/features/chat/MessageBubble'
import EmojiPicker from '@renderer/features/chat/EmojiPicker'
import TaskCreateModal from '@renderer/features/chat/TaskCreateModal'
import { useMarkRead } from '@renderer/features/chat/useMarkRead'
import { useMentionNotifications } from '@renderer/features/chat/useMentionNotifications'
import { useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

const { Text } = Typography
const { TextArea } = Input

const COMPOSER_MIN = 88
const COMPOSER_MAX = 320
const COMPOSER_DEFAULT = 136
const MESSAGES_MIN = 96

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export default function ChatView(): React.ReactElement {
  const { t, locale } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const messages = useChatStore((s) => s.messagesByGroup[gid] ?? [])
  const loading = useChatStore((s) => s.loading[gid])
  const loadError = useChatStore((s) => s.loadError[gid])
  const loadMessages = useChatStore((s) => s.loadMessages)
  const sendText = useChatStore((s) => s.sendText)
  const sendCode = useChatStore((s) => s.sendCode)
  const pickAndSendFile = useChatStore((s) => s.pickAndSendFile)
  const sendFile = useChatStore((s) => s.sendFile)
  const captureAndSendScreenshot = useChatStore((s) => s.captureAndSendScreenshot)
  const upsertMessage = useChatStore((s) => s.upsertMessage)
  const createFromChat = useTaskStore((s) => s.createFromChat)
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const listRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const members = useChatMembersStore((s) => s.membersByGroup[gid] ?? [])
  const loadMembers = useChatMembersStore((s) => s.loadMembers)
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [composerHeight, setComposerHeight] = useState(COMPOSER_DEFAULT)
  const [maxComposerHeight, setMaxComposerHeight] = useState(COMPOSER_MAX)
  const [resizing, setResizing] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = (): void => setSidebarOpen(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const messagesReady = !loading || messages.length > 0
  const { isHighlighted: isMsgHighlighted } = useSearchHighlight('msg', messagesReady)
  const dayGroups = useMemo(() => groupMessagesByDay(messages, locale), [messages, locale])

  const insertMention = useCallback((displayName: string) => {
    setDraft((prev) => {
      const replaced = prev.replace(/(?:^|\s)@([^\s@]*)$/, ` @${displayName} `)
      if (replaced !== prev) return replaced.trimStart()
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}@${displayName} `
    })
  }, [])

  const insertEmoji = useCallback((emoji: string) => {
    setDraft((prev) => `${prev}${emoji}`)
  }, [])

  const dismissMention = useCallback(() => {
    setDraft((prev) => prev.replace(/(?:^|\s)@([^\s@]*)$/, '').trimEnd())
  }, [])

  const { candidates, activeIndex, handleKeyDown: handleMentionKeyDown } = useMentionSuggest(
    draft,
    members,
    insertMention,
    dismissMention
  )

  useMentionNotifications(gid)
  useMarkRead(gid, messages, currentUserId)

  const groupType = gid ? getGroupType(gid) : 'project'
  const taskAllowed = gid && !isDmGroupId(gid) && groupType === 'project'
  const codeAllowed = gid && !isDmGroupId(gid) && groupType !== 'anonymous'
  const fileAllowed = codeAllowed
  const [fileDragOver, setFileDragOver] = useState(false)

  useEffect(() => {
    if (!gid) return
    void loadMessages(gid)
    void loadMembers(gid)
    const unsub = getLanpmApi().chat.onMessage((msg) => {
      if (msg.groupId === gid) upsertMessage(msg)
    })
    return unsub
  }, [gid, loadMessages, loadMembers, upsertMessage])

  useEffect(() => {
    const state = location.state as { composeDraft?: string } | null
    if (!state?.composeDraft) return
    setDraft(state.composeDraft)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.height - MESSAGES_MIN
      setMaxComposerHeight(Math.min(COMPOSER_MAX, Math.max(COMPOSER_MIN, available)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    setComposerHeight((h) => Math.min(h, maxComposerHeight))
  }, [maxComposerHeight])

  useEffect(() => {
    if (!resizing) {
      document.body.classList.remove('lanpm-composer-resize')
      return
    }
    document.body.classList.add('lanpm-composer-resize')
    const onMove = (e: MouseEvent): void => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - e.clientY
      const next = Math.min(
        maxComposerHeight,
        Math.max(COMPOSER_MIN, dragRef.current.startH + delta)
      )
      setComposerHeight(next)
    }

    const onUp = (): void => {
      dragRef.current = null
      setResizing(false)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('lanpm-composer-resize')
    }
  }, [resizing, maxComposerHeight])

  const onResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: composerHeight }
    setResizing(true)
  }

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || !gid) return

    const taskCmd = parseTaskCommand(text)
    if (taskCmd) {
      if (!taskAllowed) {
        message.warning(t('chat.taskNotAllowed'))
        setDraft('')
        return
      }
      if (!taskCmd.title) {
        setTaskModalOpen(true)
        setDraft('')
        return
      }
      setDraft('')
      try {
        const { message: chatMsg } = await createFromChat(gid, taskCmd.title)
        upsertMessage(chatMsg)
        message.success(t('chat.taskCreated'))
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('chat.taskCreateFailed'))
      }
      return
    }

    const savedDraft = draft
    try {
      await sendText(gid, text)
      setDraft('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('chat.sendFailed'))
      setDraft(savedDraft)
    }
  }, [draft, gid, sendText, createFromChat, upsertMessage, taskAllowed, t])

  const handleCreateTask = useCallback(
    async (title: string) => {
      if (!gid || !taskAllowed) return
      const { message: chatMsg } = await createFromChat(gid, title)
      upsertMessage(chatMsg)
      message.success(t('chat.taskCreated'))
    },
    [gid, taskAllowed, createFromChat, upsertMessage, t]
  )

  const handleSendCode = useCallback(
    async (code: string, languageHint: string) => {
      if (!gid) return
      await sendCode(gid, code, languageHint)
    },
    [gid, sendCode]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (handleMentionKeyDown(e)) return
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className={styles.chatLayout}>
      {sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label={t('chat.closeSidebar')}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <button
        type="button"
        className={styles.sidebarToggle}
        aria-label={sidebarOpen ? t('chat.closeSidebar') : t('chat.openSidebar')}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((v) => !v)}
      >
        <MenuOutlined />
      </button>
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <DmSessionBar activeGroupId={gid} />
        <MemberList
          groupId={gid}
          members={members}
          onRefresh={() => void loadMembers(gid)}
          onInsertMention={(name) => {
            insertMention(name)
            if (window.matchMedia('(max-width: 900px)').matches) setSidebarOpen(false)
          }}
        />
      </div>

      <div
        className={styles.root}
        ref={rootRef}
        onDragOver={(e) => {
          if (!fileAllowed) return
          e.preventDefault()
          setFileDragOver(true)
        }}
        onDragLeave={() => setFileDragOver(false)}
        onDrop={(e) => {
          if (!fileAllowed || !gid) return
          e.preventDefault()
          setFileDragOver(false)
          const file = e.dataTransfer?.files?.[0]
          if (!file) return
          const path = (file as File & { path?: string }).path
          if (!path) {
            message.warning(t('chat.fileNoPath'))
            return
          }
          void sendFile(gid, path).catch((err: unknown) =>
            message.error(err instanceof Error ? err.message : t('chat.fileSendFailed'))
          )
        }}
      >
        {fileDragOver && fileAllowed && (
          <div className={styles.fileDropOverlay}>{t('chat.fileDropHint')}</div>
        )}
        <div className={styles.messages} ref={listRef}>
          {loading && messages.length === 0 ? (
            <ViewLoadingCenter />
          ) : loadError && messages.length === 0 ? (
            <ViewErrorCenter
              message={t('chat.loadFailed')}
              onRetry={() => void loadMessages(gid)}
            />
          ) : messages.length === 0 ? (
            <Text className={styles.empty} type="secondary">
              {t('chat.noMessages')}
            </Text>
          ) : (
            <div className={styles.messageList}>
              {dayGroups.map((group) => (
                <div key={group.dayKey} className={styles.dayGroup}>
                  <div className={styles.dayLabel}>{group.label}</div>
                  {group.messages.map((msg) => {
                    const delivery = deliveryStatusMeta(msg.deliveryStatus, t)
                    return (
                      <MessageBubble
                        key={msg.msgId}
                        message={msg}
                        own={msg.senderUserId === currentUserId}
                        members={members}
                        deliveryLabel={delivery.text}
                        deliveryAriaLabel={delivery.ariaLabel}
                        formatTime={formatTime}
                        highlighted={isMsgHighlighted(msg.msgId)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.composer} style={{ height: composerHeight }}>
          <div
            className={`${styles.resizeHandle} ${resizing ? styles.resizeHandleActive : ''}`}
            onMouseDown={onResizeStart}
            role="separator"
            aria-orientation="horizontal"
            aria-label={t('chat.resizeComposer')}
          />
          <div className={styles.inputRow}>
            <div className={styles.toolbar}>
              <div className={styles.toolbarActions}>
                <EmojiPicker onPick={insertEmoji} />
                {taskAllowed && (
                  <Button
                    type="text"
                    icon={<PlusSquareOutlined />}
                    onClick={() => setTaskModalOpen(true)}
                    title={t('chat.taskBtn')}
                    aria-label={t('chat.taskBtn')}
                  />
                )}
                {codeAllowed && (
                  <Button
                    type="text"
                    icon={<CodeOutlined />}
                    onClick={() => setCodeModalOpen(true)}
                    title={t('chat.codeBtn')}
                    aria-label={t('chat.codeBtn')}
                  />
                )}
                {fileAllowed && (
                  <Button
                    type="text"
                    icon={<PaperClipOutlined />}
                    onClick={() =>
                      void pickAndSendFile(gid).catch((err: unknown) =>
                        message.error(
                          err instanceof Error ? err.message : t('chat.fileSendFailed')
                        )
                      )
                    }
                    title={t('chat.fileBtn')}
                    aria-label={t('chat.fileBtn')}
                  />
                )}
                {fileAllowed && (
                  <Button
                    type="text"
                    icon={<CameraOutlined />}
                    onClick={() =>
                      void captureAndSendScreenshot(gid).catch((err: unknown) =>
                        message.error(
                          err instanceof Error ? err.message : t('chat.screenshotFailed')
                        )
                      )
                    }
                    title={t('chat.screenshotBtn')}
                    aria-label={t('chat.screenshotBtn')}
                  />
                )}
              </div>
              <Segmented
                className={styles.inputModeToggle}
                size="small"
                value={inputMode}
                onChange={(v) => setInputMode(v as 'text' | 'voice')}
                options={[
                  {
                    value: 'text',
                    icon: <EditOutlined />,
                    label: t('chat.inputModeText')
                  },
                  {
                    value: 'voice',
                    icon: <AudioOutlined />,
                    label: t('chat.inputModeVoice')
                  }
                ]}
              />
            </div>
            <div className={styles.composerBody}>
              <div className={styles.inputMain}>
                {inputMode === 'text' ? (
                  <>
                    <Text type="secondary" className={styles.inputHint}>
                      {t('chat.inputHintEnter')}
                      {taskAllowed ? t('chat.inputHintTask') : ''}
                    </Text>
                    <div className={styles.inputWrap}>
                      <MentionSuggest
                        candidates={candidates}
                        activeIndex={activeIndex}
                        onPick={insertMention}
                      />
                      <TextArea
                        className={styles.inputTextarea}
                        placeholder={
                          taskAllowed ? t('chat.placeholderTask') : t('chat.placeholder')
                        }
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={onKeyDown}
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.voicePanel}>
                    <Button className={styles.voiceHoldBtn} disabled block>
                      {t('chat.voiceHoldHint')}
                    </Button>
                    <Text type="secondary" className={styles.voiceHint}>
                      {t('chat.voiceComingSoon')}
                    </Text>
                  </div>
                )}
              </div>
              <Button
                type="primary"
                className={styles.sendBtn}
                disabled={inputMode === 'voice'}
                onClick={() => void handleSend()}
              >
                {t('common.send')}
              </Button>
            </div>
          </div>
        </div>

        <CodeSendModal
          open={codeModalOpen}
          onClose={() => setCodeModalOpen(false)}
          onSend={handleSendCode}
        />

        {taskAllowed && (
          <TaskCreateModal
            open={taskModalOpen}
            onClose={() => setTaskModalOpen(false)}
            onSubmit={async (title) => {
              try {
                await handleCreateTask(title)
              } catch (err) {
                message.error(err instanceof Error ? err.message : t('chat.taskCreateFailed'))
                throw err
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GroupMemberView } from '@shared/chat/members'
import { Button, Input, Segmented, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import {
  AudioOutlined,
  CameraOutlined,
  CodeOutlined,
  EditOutlined,
  FolderOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  PaperClipOutlined,
  PlusSquareOutlined
} from '@ant-design/icons'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { isDmGroupId } from '@shared/chat/dmSession'
import { groupAllowsDirectMessage } from '@shared/group/guards'
import { groupViewPath } from '@renderer/routes/paths'
import { useDmStore } from '@renderer/stores/dmStore'
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
import MemberProfileModal from '@renderer/features/chat/MemberProfileModal'
import EmojiPicker from '@renderer/features/chat/EmojiPicker'
import TaskCreateModal from '@renderer/features/chat/TaskCreateModal'
import { useMarkRead } from '@renderer/features/chat/useMarkRead'
import { useNewMessageScroll } from '@renderer/features/chat/useNewMessageScroll'
import { useSearchHighlight } from '@renderer/hooks/useSearchHighlight'
import { ViewErrorCenter, ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

const { Text } = Typography
const { TextArea } = Input

const COMPOSER_MIN = 96
const COMPOSER_MAX = 360
const COMPOSER_DEFAULT = 176
const MESSAGES_MIN = 96

const SIDEBAR_MIN = 160
const SIDEBAR_MAX = 400
const SIDEBAR_DEFAULT = 240
const SIDEBAR_WIDTH_KEY = 'lanpm-chat-sidebar-width'

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
  const inDm = isDmGroupId(gid)
  const lastOriginGroupId = useDmStore((s) => s.lastOriginGroupId)
  const dmSession = useDmStore((s) => (inDm ? s.getSession(gid) : undefined))
  const projectGroupId = inDm ? (dmSession?.originGroupId ?? lastOriginGroupId) : gid
  const [dmPickerOpen, setDmPickerOpen] = useState(false)

  useEffect(() => {
    setDmPickerOpen(false)
  }, [gid])
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
  const [isNarrow, setIsNarrow] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
    if (Number.isFinite(saved) && saved >= SIDEBAR_MIN && saved <= SIDEBAR_MAX) return saved
    return SIDEBAR_DEFAULT
  })
  const [sidebarResizing, setSidebarResizing] = useState(false)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  const [profileMember, setProfileMember] = useState<GroupMemberView | null>(null)
  const chatChannel: 'group' | 'dm' = dmPickerOpen || inDm ? 'dm' : 'group'
  const showDmPicker = dmPickerOpen

  const onChatChannelChange = (value: string | number): void => {
    if (value === 'group') {
      setDmPickerOpen(false)
      if (inDm && projectGroupId) {
        navigate(groupViewPath(projectGroupId, 'chat'))
      }
      return
    }
    setDmPickerOpen(true)
  }
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)
  const sidebarDragRef = useRef<{ startX: number; startW: number } | null>(null)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const sync = (): void => {
      setIsNarrow(mq.matches)
      setSidebarOpen(!mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const messagesReady = !loading || messages.length > 0
  const { isHighlighted: isMsgHighlighted } = useSearchHighlight('msg', messagesReady)
  const dayGroups = useMemo(() => groupMessagesByDay(messages, locale), [messages, locale])

  const groupType = gid ? getGroupType(gid) : 'project'
  const originGroupId = inDm ? (dmSession?.originGroupId ?? lastOriginGroupId) : gid
  const dmAllowed = groupAllowsDirectMessage(getGroupType(originGroupId))
  const isMemoryOnlyAnonymous = Boolean(gid && !inDm && groupType === 'anonymous')
  const taskAllowed = Boolean(gid && !inDm && groupType === 'project')
  const codeAllowed = Boolean(gid && !isMemoryOnlyAnonymous)
  const fileAllowed = codeAllowed

  const insertMention = useCallback((displayName: string) => {
    setDraft((prev) => {
      const replaced = prev.replace(/(?:^|\s)@([^\s@]*)$/, ` @${displayName} `)
      if (replaced !== prev) return replaced.trimStart()
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}@${displayName} `
    })
  }, [])

  const openSession = useDmStore((s) => s.openSession)

  const startDmWithMember = useCallback(
    (member: GroupMemberView) => {
      if (!currentUserId || member.userId === currentUserId || !dmAllowed || inDm) return
      const dmGroupId = openSession(
        member.userId,
        member.displayName,
        currentUserId,
        originGroupId,
        getGroupType(originGroupId)
      )
      if (!dmGroupId) return
      navigate(groupViewPath(dmGroupId, 'chat'))
    },
    [currentUserId, dmAllowed, inDm, openSession, originGroupId, getGroupType, navigate]
  )

  const viewSenderProfile = useCallback((member: GroupMemberView) => {
    setProfileMember(member)
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

  useMarkRead(gid, messages, currentUserId)

  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : undefined
  const { pendingNewCount, onMessagesScroll, jumpToLatest } = useNewMessageScroll({
    listRef,
    messageCount: messages.length,
    lastSenderUserId: lastMessage?.senderUserId,
    currentUserId,
    groupKey: gid
  })

  const onlineCount = useMemo(
    () => members.filter((m) => m.presence === 'online').length,
    [members]
  )
  const showChatContextBar = !showDmPicker && !inDm && members.length > 0

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

  useEffect(() => {
    if (!sidebarResizing) {
      document.body.classList.remove('lanpm-sidebar-resize')
      return
    }
    document.body.classList.add('lanpm-sidebar-resize')
    const onMove = (e: MouseEvent): void => {
      if (!sidebarDragRef.current) return
      const delta = e.clientX - sidebarDragRef.current.startX
      const next = Math.min(
        SIDEBAR_MAX,
        Math.max(SIDEBAR_MIN, sidebarDragRef.current.startW + delta)
      )
      setSidebarWidth(next)
    }

    const onUp = (): void => {
      sidebarDragRef.current = null
      setSidebarResizing(false)
      setSidebarWidth((w) => {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(w))
        return w
      })
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.classList.remove('lanpm-sidebar-resize')
    }
  }, [sidebarResizing])

  const onSidebarResizeStart = (e: React.MouseEvent): void => {
    e.preventDefault()
    sidebarDragRef.current = { startX: e.clientX, startW: sidebarWidth }
    setSidebarResizing(true)
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
      {!isNarrow && !sidebarOpen && (
        <button
          type="button"
          className={styles.sidebarExpandBtn}
          aria-label={t('chat.openSidebar')}
          onClick={() => setSidebarOpen(true)}
        >
          <MenuUnfoldOutlined />
        </button>
      )}
      <div
        className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''} ${!isNarrow && !sidebarOpen ? styles.sidebarCollapsed : ''}`}
        style={!isNarrow && sidebarOpen ? { width: sidebarWidth } : undefined}
      >
        {!isNarrow && sidebarOpen && (
          <div className={styles.sidebarHeader}>
            <button
              type="button"
              className={styles.sidebarCollapseBtn}
              aria-label={t('chat.closeSidebar')}
              onClick={() => setSidebarOpen(false)}
            >
              <MenuFoldOutlined />
            </button>
          </div>
        )}
        <MemberList
          groupId={gid}
          members={members}
          onRefresh={() => void loadMembers(gid)}
          onInsertMention={(name) => {
            insertMention(name)
            if (isNarrow) setSidebarOpen(false)
          }}
        />
        {!isNarrow && sidebarOpen && (
          <div
            className={`${styles.sidebarResizeHandle} ${sidebarResizing ? styles.sidebarResizeHandleActive : ''}`}
            onMouseDown={onSidebarResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label={t('chat.resizeSidebar')}
          />
        )}
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
        <div className={styles.chatModeBar}>
          <Segmented
            className={styles.chatChannelToggle}
            size="small"
            value={chatChannel}
            onChange={onChatChannelChange}
            options={[
              { label: t('chat.groupChat'), value: 'group' },
              { label: t('chat.dmTab'), value: 'dm' }
            ]}
          />
        </div>
        {showDmPicker ? (
          <DmSessionBar activeGroupId={gid} layout="main" />
        ) : (
          <>
        {showChatContextBar && (
          <div className={styles.chatContextBar}>
            <Text className={styles.chatContextMeta}>
              {t('chat.onlineStats', { online: onlineCount, total: members.length })}
            </Text>
            {groupType === 'project' && (
              <Button
                type="link"
                size="small"
                icon={<FolderOutlined />}
                className={styles.chatContextLink}
                onClick={() => navigate(groupViewPath(gid, 'files'))}
              >
                {t('chat.openGroupFiles')}
              </Button>
            )}
          </div>
        )}
        <div className={styles.messagesWrap}>
        <div className={styles.messages} ref={listRef} onScroll={onMessagesScroll}>
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
                  {group.messages.map((msg, msgIndex) => {
                    const prev = msgIndex > 0 ? group.messages[msgIndex - 1] : null
                    const showSender =
                      !prev ||
                      prev.senderUserId !== msg.senderUserId ||
                      msg.createdAt.slice(0, 16) !== prev.createdAt.slice(0, 16)
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
                        showSender={showSender}
                        dmAllowed={dmAllowed && !inDm}
                        onMentionSender={insertMention}
                        onViewSender={viewSenderProfile}
                        onDmSender={startDmWithMember}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        {pendingNewCount > 0 && (
          <button
            type="button"
            className={styles.newMessagesJump}
            onClick={jumpToLatest}
          >
            {t('chat.newMessagesJump', { count: pendingNewCount })}
          </button>
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
          </>
        )}

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

        <MemberProfileModal
          open={profileMember != null}
          member={profileMember}
          isSelf={profileMember?.userId === currentUserId}
          dmAllowed={dmAllowed && !inDm}
          onClose={() => setProfileMember(null)}
          onMention={insertMention}
          onStartDm={startDmWithMember}
        />
      </div>
    </div>
  )
}

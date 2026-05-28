import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, Spin, Typography, message } from 'antd'
import { CodeOutlined, PlusSquareOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import type { GroupMemberView } from '@shared/chat/members'
import { isDmGroupId } from '@shared/chat/dmSession'
import { parseTaskCommand } from '@shared/chat/taskCommand'
import { useChatStore } from '@renderer/stores/chatStore'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import CodeSendModal from '@renderer/features/chat/CodeSendModal'
import DmSessionBar from '@renderer/features/chat/DmSessionBar'
import MemberList from '@renderer/features/chat/MemberList'
import MentionSuggest from '@renderer/features/chat/MentionSuggest'
import MessageBubble from '@renderer/features/chat/MessageBubble'
import TaskCreateModal from '@renderer/features/chat/TaskCreateModal'
import { useMarkRead } from '@renderer/features/chat/useMarkRead'
import { useMentionNotifications } from '@renderer/features/chat/useMentionNotifications'
import styles from './chat.module.css'

const { Text } = Typography
const { TextArea } = Input

const COMPOSER_MIN = 88
const COMPOSER_MAX = 320
const COMPOSER_DEFAULT = 120
const MESSAGES_MIN = 96

function deliveryLabel(status: 'sending' | 'sent' | 'read'): string {
  if (status === 'sending') return '⏳'
  if (status === 'sent') return '✅'
  if (status === 'read') return '✅✅'
  return ''
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

export default function ChatView(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const gid = groupId ?? ''
  const messages = useChatStore((s) => s.messagesByGroup[gid] ?? [])
  const loading = useChatStore((s) => s.loading[gid])
  const loadMessages = useChatStore((s) => s.loadMessages)
  const sendText = useChatStore((s) => s.sendText)
  const sendCode = useChatStore((s) => s.sendCode)
  const upsertMessage = useChatStore((s) => s.upsertMessage)
  const createFromChat = useTaskStore((s) => s.createFromChat)
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const listRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [members, setMembers] = useState<GroupMemberView[]>([])
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [composerHeight, setComposerHeight] = useState(COMPOSER_DEFAULT)
  const [maxComposerHeight, setMaxComposerHeight] = useState(COMPOSER_MAX)
  const [resizing, setResizing] = useState(false)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useMentionNotifications(gid)
  useMarkRead(gid, messages, currentUserId)

  const groupType = gid ? getGroupType(gid) : 'project'
  const taskAllowed = gid && !isDmGroupId(gid) && groupType === 'project'
  const codeAllowed = gid && !isDmGroupId(gid) && groupType !== 'anonymous'

  useEffect(() => {
    if (!gid) return
    void loadMessages(gid)
    void getLanpmApi()
      .chat.listMembers(gid)
      .then(setMembers)
      .catch(() => setMembers([]))
    const unsub = getLanpmApi().chat.onMessage((msg) => {
      if (msg.groupId === gid) upsertMessage(msg)
    })
    return unsub
  }, [gid, loadMessages, upsertMessage])

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

  const insertMention = useCallback((displayName: string) => {
    setDraft((prev) => {
      const replaced = prev.replace(/(?:^|\s)@([^\s@]*)$/, ` @${displayName} `)
      if (replaced !== prev) return replaced.trimStart()
      const sep = prev.length > 0 && !prev.endsWith(' ') ? ' ' : ''
      return `${prev}${sep}@${displayName} `
    })
  }, [])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || !gid) return

    const taskCmd = parseTaskCommand(text)
    if (taskCmd) {
      if (!taskAllowed) {
        message.warning('当前群组不支持创建任务')
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
        message.success('任务已创建，可在看板查看')
      } catch (err) {
        message.error(err instanceof Error ? err.message : '创建任务失败')
      }
      return
    }

    setDraft('')
    await sendText(gid, text)
  }, [draft, gid, sendText, createFromChat, upsertMessage, taskAllowed])

  const handleCreateTask = useCallback(
    async (title: string) => {
      if (!gid || !taskAllowed) return
      const { message: chatMsg } = await createFromChat(gid, title)
      upsertMessage(chatMsg)
      message.success('任务已创建，可在看板查看')
    },
    [gid, taskAllowed, createFromChat, upsertMessage]
  )

  const handleSendCode = useCallback(
    async (code: string, languageHint: string) => {
      if (!gid) return
      await sendCode(gid, code, languageHint)
    },
    [gid, sendCode]
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className={styles.chatLayout}>
      <div className={styles.sidebar}>
        <DmSessionBar activeGroupId={gid} />
        <MemberList groupId={gid} onInsertMention={insertMention} />
      </div>

      <div className={styles.root} ref={rootRef}>
        <div className={styles.messages} ref={listRef}>
          {loading && messages.length === 0 ? (
            <Spin className={styles.empty} />
          ) : messages.length === 0 ? (
            <Text className={styles.empty} type="secondary">
              暂无消息，输入 @成员名 可提及
            </Text>
          ) : (
            <div className={styles.messageList}>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.msgId}
                  message={msg}
                  own={msg.senderUserId === currentUserId}
                  members={members}
                  deliveryLabel={deliveryLabel(msg.deliveryStatus)}
                  formatTime={formatTime}
                />
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
            aria-label="调整输入框高度"
          />
          <div className={styles.inputRow}>
            <div className={styles.inputMain}>
              <Text type="secondary" className={styles.inputHint}>
                Ctrl+Enter 发送 · @ 提及
                {taskAllowed ? ' · /task 或 /task 标题 创建任务' : ''}
              </Text>
              <div className={styles.inputWrap}>
                <MentionSuggest draft={draft} members={members} onPick={insertMention} />
                <TextArea
                  className={styles.inputTextarea}
                  placeholder={taskAllowed ? '输入消息，/task 创建任务…' : '输入消息…'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKeyDown}
                />
              </div>
            </div>
            <div className={styles.inputActions}>
              {taskAllowed && (
                <Button
                  icon={<PlusSquareOutlined />}
                  onClick={() => setTaskModalOpen(true)}
                  title="/task"
                >
                  任务
                </Button>
              )}
              {codeAllowed && (
                <Button icon={<CodeOutlined />} onClick={() => setCodeModalOpen(true)}>
                  代码
                </Button>
              )}
              <Button type="primary" onClick={() => void handleSend()}>
                发送
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
                message.error(err instanceof Error ? err.message : '创建任务失败')
                throw err
              }
            }}
          />
        )}
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, Spin, Typography } from 'antd'
import { CodeOutlined } from '@ant-design/icons'
import { useParams } from 'react-router-dom'
import { useChatStore } from '@renderer/stores/chatStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import CodeSendModal from '@renderer/features/chat/CodeSendModal'
import MessageBubble from '@renderer/features/chat/MessageBubble'
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
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const listRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [composerHeight, setComposerHeight] = useState(COMPOSER_DEFAULT)
  const [maxComposerHeight, setMaxComposerHeight] = useState(COMPOSER_MAX)
  const [resizing, setResizing] = useState(false)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  useEffect(() => {
    if (!gid) return
    void loadMessages(gid)
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

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || !gid) return
    setDraft('')
    await sendText(gid, text)
  }, [draft, gid, sendText])

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
    <div className={styles.root} ref={rootRef}>
      <div className={styles.messages} ref={listRef}>
        {loading && messages.length === 0 ? (
          <Spin className={styles.empty} />
        ) : messages.length === 0 ? (
          <Text className={styles.empty} type="secondary">
            暂无消息，发送第一条吧
          </Text>
        ) : (
          <div className={styles.messageList}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.msgId}
                message={msg}
                own={msg.senderUserId === currentUserId}
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
              Ctrl+Enter 发送
            </Text>
            <TextArea
              className={styles.inputTextarea}
              placeholder="输入消息…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
          <div className={styles.inputActions}>
            <Button icon={<CodeOutlined />} onClick={() => setCodeModalOpen(true)}>
              代码
            </Button>
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
    </div>
  )
}

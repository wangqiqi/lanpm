import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Input, Spin, Typography } from 'antd'
import { useParams } from 'react-router-dom'
import type { ChatMessage } from '@shared/chat/types'
import { useChatStore } from '@renderer/stores/chatStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import styles from './chat.module.css'

const { Text } = Typography
const { TextArea } = Input

function deliveryLabel(status: ChatMessage['deliveryStatus']): string {
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
  const upsertMessage = useChatStore((s) => s.upsertMessage)
  const currentUserId = useIdentityStore((s) => s.user?.userId)
  const listRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState('')

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

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || !gid) return
    setDraft('')
    await sendText(gid, text)
  }, [draft, gid, sendText])

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text type="secondary">Ctrl+Enter 发送 · NetworkStub 局域网同步</Text>
      </div>

      <div className={styles.messages} ref={listRef}>
        {loading && messages.length === 0 ? (
          <Spin className={styles.empty} />
        ) : messages.length === 0 ? (
          <Text className={styles.empty} type="secondary">
            暂无消息，发送第一条吧
          </Text>
        ) : (
          messages.map((msg) => {
            const own = msg.senderUserId === currentUserId
            const text =
              msg.content.kind === 'text' ? msg.content.text : `[${msg.type}]`
            return (
              <div
                key={msg.msgId}
                className={`${styles.bubble} ${own ? styles.bubbleOwn : styles.bubbleOther}`}
              >
                {!own && (
                  <div className={styles.meta}>
                    {msg.senderUserId} · {formatTime(msg.createdAt)}
                  </div>
                )}
                <div>{text}</div>
                {own && (
                  <div className={styles.status}>
                    {formatTime(msg.createdAt)} {deliveryLabel(msg.deliveryStatus)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className={styles.inputRow}>
        <TextArea
          placeholder="输入消息…"
          autoSize={{ minRows: 1, maxRows: 4 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button type="primary" onClick={() => void handleSend()}>
          发送
        </Button>
      </div>
    </div>
  )
}

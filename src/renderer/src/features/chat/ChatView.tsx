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
  const [draft, setDraft] = useState('')
  const [codeModalOpen, setCodeModalOpen] = useState(false)

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
    <div className={styles.root}>
      <div className={styles.header}>
        <Text type="secondary">Ctrl+Enter 发送 · 支持代码块语法高亮</Text>
      </div>

      <div className={styles.messages} ref={listRef}>
        {loading && messages.length === 0 ? (
          <Spin className={styles.empty} />
        ) : messages.length === 0 ? (
          <Text className={styles.empty} type="secondary">
            暂无消息，发送第一条吧
          </Text>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.msgId}
              message={msg}
              own={msg.senderUserId === currentUserId}
              deliveryLabel={deliveryLabel(msg.deliveryStatus)}
              formatTime={formatTime}
            />
          ))
        )}
      </div>

      <div className={styles.inputRow}>
        <Button icon={<CodeOutlined />} onClick={() => setCodeModalOpen(true)}>
          代码
        </Button>
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

      <CodeSendModal
        open={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        onSend={handleSendCode}
      />
    </div>
  )
}

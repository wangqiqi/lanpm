import { randomUUID } from 'crypto'
import { BrowserWindow } from 'electron'
import type { Database } from 'better-sqlite3'
import type { ChatMessage, ChatPayload, MessageContent, MessageType } from '../../shared/chat/types'
import { CHAT_PUSH_CHANNEL } from '../../shared/chat/channels'
import { detectLanguage } from '../../shared/chat/detectLanguage'
import { parseMentions } from '../../shared/chat/mentions'
import type { NetworkTransport, SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { listGroupMembers } from './memberService'
import { notifyIfMentioned } from './notificationService'
import { getNetworkTransport } from '../network/stub'
import {
  getMaxLamportTs,
  insertMessage,
  listMessagesByGroup,
  messageExists,
  updateDeliveryStatus
} from '../storage/repositories/messageRepository'

const subscribedGroups = new Map<string, () => void>()

function broadcastMessage(message: ChatMessage): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(CHAT_PUSH_CHANNEL, message)
  }
}

function handleIncoming(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type !== 'chat' || !envelope.groupId) return
  const payload = envelope.payload as ChatPayload
  const incoming = payload?.message
  if (!incoming?.msgId) return
  if (messageExists(db, incoming.msgId)) return

  const stored: ChatMessage = {
    ...incoming,
    groupId: envelope.groupId,
    deliveryStatus: 'sent'
  }
  insertMessage(db, stored)
  broadcastMessage(stored)

  const status = getSetupStatus(db)
  if (status.configured && status.user) {
    notifyIfMentioned(stored, status.user.userId)
  }
}

function ensureSubscribed(db: Database, transport: NetworkTransport, groupId: string): void {
  if (subscribedGroups.has(groupId)) return
  const unsub = transport.subscribe(groupId, (env) => handleIncoming(db, env))
  subscribedGroups.set(groupId, unsub)
}

export function initChatService(db: Database): void {
  const transport = getNetworkTransport()
  if (!transport) return

  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()

  for (const groupId of ['demo-project', 'demo-function', 'demo-anonymous']) {
    ensureSubscribed(db, transport, groupId)
  }
}

export function shutdownChatService(): void {
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
}

export function listGroupMessages(db: Database, groupId: string): ChatMessage[] {
  const transport = getNetworkTransport()
  if (transport) ensureSubscribed(db, transport, groupId)
  return listMessagesByGroup(db, groupId)
}

async function publishChatMessage(
  db: Database,
  groupId: string,
  type: MessageType,
  content: MessageContent,
  mentions?: string[]
): Promise<ChatMessage> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throw new Error('请先完成身份配置')
  }

  const transport = getNetworkTransport()
  if (!transport) throw new Error('网络未就绪')

  ensureSubscribed(db, transport, groupId)

  const lamportTs = getMaxLamportTs(db, groupId) + 1
  const now = new Date().toISOString()
  const msg: ChatMessage = {
    msgId: `msg_${randomUUID()}`,
    groupId,
    senderUserId: status.user.userId,
    senderDeviceId: status.device.deviceId,
    type,
    content,
    lamportTs,
    createdAt: now,
    deliveryStatus: 'sending',
    mentions: mentions?.length ? mentions : undefined
  }

  insertMessage(db, msg)
  broadcastMessage(msg)

  const envelope: SyncEnvelope = {
    version: 1,
    type: 'chat',
    msgId: msg.msgId,
    senderUserId: msg.senderUserId,
    senderDeviceId: msg.senderDeviceId,
    groupId,
    ts: now,
    lamportTs,
    payload: { message: msg } satisfies ChatPayload,
    nonce: '',
    authTag: ''
  }

  await transport.publish(envelope)

  updateDeliveryStatus(db, msg.msgId, 'sent')
  const sent: ChatMessage = { ...msg, deliveryStatus: 'sent' }
  broadcastMessage(sent)
  return sent
}

export async function sendTextMessage(
  db: Database,
  groupId: string,
  text: string
): Promise<ChatMessage> {
  const trimmed = text.trim()
  if (!trimmed) throw new Error('消息不能为空')
  const members = await listGroupMembers(db, groupId)
  const mentions = parseMentions(trimmed, members)
  return publishChatMessage(
    db,
    groupId,
    'text',
    { kind: 'text', text: trimmed },
    mentions
  )
}

export { listGroupMembers }

export async function sendCodeMessage(
  db: Database,
  groupId: string,
  code: string,
  languageHint?: string,
  theme?: 'light' | 'dark'
): Promise<ChatMessage> {
  const trimmed = code.trim()
  if (!trimmed) throw new Error('代码不能为空')
  const language = detectLanguage(trimmed, languageHint)
  return publishChatMessage(db, groupId, 'code', {
    kind: 'code',
    language,
    code: trimmed,
    theme
  })
}

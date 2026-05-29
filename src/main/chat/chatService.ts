import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import { dialog } from 'electron'
import type { ChatMessage, MessageContent, MessageType } from '../../shared/chat/types'
import { isAnonymousGroupType } from '../../shared/group/guards'
import { detectLanguage } from '../../shared/chat/detectLanguage'
import { parseMentions } from '../../shared/chat/mentions'
import type { NetworkTransport, SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { listGroupMembers } from './memberService'
import { notifyIfMentioned } from './notificationService'
import { handleGroupKeyRotate, initGroupKeyService, shutdownGroupKeyService } from '../crypto/groupKeyService'
import {
  handleChatSyncBatch,
  handleChatSyncRequest,
  initOfflineSyncMeta,
  requestOfflineSync
} from './offlineSyncService'
import { uploadFileFromPath } from '../file/fileService'
import { initReadReceiptService, shutdownReadReceiptService } from './readReceiptService'
import { broadcastMessage } from './chatBroadcast'
import { getNetworkTransport } from '../network'
import {
  appendAnonymousMessage,
  listAnonymousMessages
} from './anonymousChatStore'
import {
  getMaxLamportTs,
  insertMessage,
  listMessagesByGroup,
  messageExists,
  updateDeliveryStatus
} from '../storage/repositories/messageRepository'

const subscribedGroups = new Map<string, () => void>()

function isAnonymousGroup(db: Database, groupId: string): boolean {
  return isAnonymousGroupType(resolveGroupType(db, groupId))
}

function handleIncoming(db: Database, envelope: SyncEnvelope): void {
  if (envelope.type === 'group_key_rotate') {
    handleGroupKeyRotate(db, envelope)
    return
  }
  if (envelope.type === 'chat_sync_request') {
    void handleChatSyncRequest(db, envelope).catch(() => undefined)
    return
  }
  if (envelope.type === 'chat_sync_batch') {
    handleChatSyncBatch(db, envelope)
    return
  }
  if (envelope.type !== 'chat' || !envelope.groupId) return
  const payload = envelope.payload as { message?: ChatMessage }
  const incoming = payload?.message
  if (!incoming?.msgId) return

  if (isAnonymousGroup(db, envelope.groupId)) {
    if (incoming.type !== 'text') return
    const stored: ChatMessage = { ...incoming, groupId: envelope.groupId, deliveryStatus: 'sent' }
    appendAnonymousMessage(envelope.groupId, stored)
    broadcastMessage(stored)
    return
  }

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

function refreshGroupSubscriptions(db: Database, transport: NetworkTransport): void {
  for (const group of listUserGroups(db)) {
    ensureSubscribed(db, transport, group.groupId)
  }
}

export function initChatService(db: Database): void {
  const transport = getNetworkTransport()
  if (!transport) return

  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()

  refreshGroupSubscriptions(db, transport)
  initReadReceiptService(db)
  initGroupKeyService(db)
  initOfflineSyncMeta(db)
  void requestOfflineSync(db).catch(() => undefined)
}

export function shutdownChatService(): void {
  shutdownGroupKeyService()
  shutdownReadReceiptService()
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
}

export function listGroupMessages(db: Database, groupId: string): ChatMessage[] {
  const transport = getNetworkTransport()
  if (transport) ensureSubscribed(db, transport, groupId)

  if (isAnonymousGroup(db, groupId)) {
    return listAnonymousMessages(groupId)
  }
  return listMessagesByGroup(db, groupId)
}

export async function publishChatMessage(
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

  if (isAnonymousGroup(db, groupId)) {
    if (type !== 'text') throw new Error('匿名群仅支持文本消息')
  }

  const transport = getNetworkTransport()
  if (!transport) throw new Error('网络未就绪')

  ensureSubscribed(db, transport, groupId)

  const lamportTs = isAnonymousGroup(db, groupId)
    ? listAnonymousMessages(groupId).length + 1
    : getMaxLamportTs(db, groupId) + 1
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

  if (isAnonymousGroup(db, groupId)) {
    const sent: ChatMessage = { ...msg, deliveryStatus: 'sent' }
    appendAnonymousMessage(groupId, sent)
    broadcastMessage(sent)

    const envelope: SyncEnvelope = {
      version: 1,
      type: 'chat',
      msgId: msg.msgId,
      senderUserId: msg.senderUserId,
      senderDeviceId: msg.senderDeviceId,
      groupId,
      ts: now,
      lamportTs,
      payload: { message: sent },
      nonce: '',
      authTag: ''
    }
    await transport.publish(envelope)
    return sent
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
    payload: { message: msg },
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

export async function pickAndSendFileMessage(
  db: Database,
  groupId: string
): Promise<ChatMessage | null> {
  const result = await dialog.showOpenDialog({ properties: ['openFile'] })
  if (result.canceled || !result.filePaths[0]) return null
  return sendFileMessage(db, groupId, result.filePaths[0])
}

export async function sendFileMessage(
  db: Database,
  groupId: string,
  sourcePath: string
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throw new Error('匿名群不支持发送文件')
  }
  const meta = await uploadFileFromPath(db, groupId, sourcePath)
  return publishChatMessage(db, groupId, 'file', {
    kind: 'file',
    fileId: meta.fileId,
    fileName: meta.name,
    size: meta.size
  })
}

export async function sendCodeMessage(
  db: Database,
  groupId: string,
  code: string,
  languageHint?: string,
  theme?: 'light' | 'dark'
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throw new Error('匿名群仅支持文本消息')
  }
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

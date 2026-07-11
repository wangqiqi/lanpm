import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { BrowserWindow } from 'electron'
import type { ChatMessage, MessageContent, MessageType } from '../../shared/chat/types'
import type { ChatMessagePage } from '../../shared/chat/pagination'
import { CHAT_HISTORY_PAGE_SIZE } from '../../shared/chat/pagination'
import { throwLanpm } from '../../shared/errors/lanpmError'
import { isMemoryOnlyChatGroup } from '../../shared/group/guards'
import { detectLanguage } from '../../shared/chat/detectLanguage'
import { parseMentions } from '../../shared/chat/mentions'
import { runWithPublishRetries } from '../../shared/chat/publishRetry'
import type { NetworkTransport, SyncEnvelope } from '../../shared/network'
import { getSetupStatus } from '../identity/setup'
import { listUserGroups, resolveGroupType } from '../group/groupService'
import { listGroupMembers } from './memberService'
import { handleGroupKeyRotate, initGroupKeyService, shutdownGroupKeyService } from '../crypto/groupKeyService'
import {
  handleChatSyncBatch,
  handleChatSyncRequest,
  requestOfflineSync
} from './offlineSyncService'
import { ensureLocalRetentionMeta } from '../data/retentionMeta'
import {
  initMessageRetentionScheduler,
  shutdownMessageRetentionScheduler
} from '../data/messageRetentionService'
import { uploadFileFromPath } from '../file/fileService'
import { getFileById } from '../storage/repositories/fileRepository'
import { getTaskById } from '../storage/repositories/taskRepository'
import { assertGroupAllowsTasks } from '../../shared/group/guards'
import { showOpenDialog } from '../systemDialog'
import { initFileSyncService, shutdownFileSyncService } from '../file/fileSyncService'
import { initReadReceiptService, shutdownReadReceiptService } from './readReceiptService'
import {
  handleReadReceiptSyncBatch,
  handleReadReceiptSyncRequest,
  requestReadReceiptOfflineSync
} from './readReceiptOfflineSyncService'
import { initTaskSyncService, shutdownTaskSyncService } from '../task/taskSyncService'
import {
  initWhiteboardSyncService,
  shutdownWhiteboardSyncService
} from '../whiteboard/whiteboardSyncService'
import { handleIncomingMemberEvent } from '../group/memberEventService'
import { broadcastMessage } from './chatBroadcast'
import { getNetworkTransport } from '../network'
import {
  appendAnonymousMessage,
  listAnonymousMessages,
  replaceAnonymousMessage
} from './anonymousChatStore'
import {
  getMaxLamportTs,
  getMessageById,
  insertMessage,
  listMessagesBeforePage,
  listRecentMessagesPage,
  messageExists,
  updateDeliveryStatus
} from '../storage/repositories/messageRepository'
import { handleChatRecall, recallMessage } from './recallMessageService'

const subscribedGroups = new Map<string, () => void>()

function buildEnvelope(msg: ChatMessage, payload?: Record<string, unknown>): SyncEnvelope {
  return {
    version: 1,
    type: 'chat',
    msgId: msg.msgId,
    senderUserId: msg.senderUserId,
    senderDeviceId: msg.senderDeviceId,
    groupId: msg.groupId,
    ts: msg.createdAt,
    lamportTs: msg.lamportTs,
    payload: payload ?? { message: msg },
    nonce: '',
    authTag: ''
  }
}

function isAnonymousGroup(db: Database, groupId: string): boolean {
  return isMemoryOnlyChatGroup(groupId, resolveGroupType(db, groupId))
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
  if (envelope.type === 'chat_recall') {
    handleChatRecall(db, envelope)
    return
  }
  if (envelope.type === 'read_receipt_sync_request') {
    void handleReadReceiptSyncRequest(db, envelope).catch(() => undefined)
    return
  }
  if (envelope.type === 'read_receipt_sync_batch') {
    handleReadReceiptSyncBatch(db, envelope)
    return
  }
  if (envelope.type === 'member_event') {
    handleIncomingMemberEvent(db, envelope)
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
  ensureLocalRetentionMeta(db)
  initMessageRetentionScheduler(db)
  initTaskSyncService(db)
  initWhiteboardSyncService(db)
  initFileSyncService(db)
  void requestOfflineSync(db).catch(() => undefined)
  void requestReadReceiptOfflineSync(db).catch(() => undefined)
}

export function shutdownChatService(): void {
  shutdownMessageRetentionScheduler()
  shutdownTaskSyncService()
  shutdownWhiteboardSyncService()
  shutdownFileSyncService()
  shutdownGroupKeyService()
  shutdownReadReceiptService()
  for (const unsub of subscribedGroups.values()) unsub()
  subscribedGroups.clear()
}

export function listGroupMessages(db: Database, groupId: string): ChatMessagePage {
  const transport = getNetworkTransport()
  if (transport) ensureSubscribed(db, transport, groupId)

  if (isAnonymousGroup(db, groupId)) {
    const messages = listAnonymousMessages(groupId)
    return { messages, hasMore: false }
  }
  return listRecentMessagesPage(db, groupId, CHAT_HISTORY_PAGE_SIZE)
}

export function listOlderGroupMessages(
  db: Database,
  groupId: string,
  beforeLamportTs: number
): ChatMessagePage {
  const transport = getNetworkTransport()
  if (transport) ensureSubscribed(db, transport, groupId)

  if (isAnonymousGroup(db, groupId)) {
    return { messages: [], hasMore: false }
  }
  if (!Number.isFinite(beforeLamportTs) || beforeLamportTs <= 0) {
    return { messages: [], hasMore: false }
  }
  return listMessagesBeforePage(db, groupId, beforeLamportTs, CHAT_HISTORY_PAGE_SIZE)
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
    throwLanpm('stub.identityRequired')
  }

  if (isAnonymousGroup(db, groupId)) {
    if (type !== 'text') throwLanpm('err.anonymousTextOnly')
  }

  const transport = getNetworkTransport()
  if (!transport) throwLanpm('err.networkNotReady')

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
    const sending: ChatMessage = { ...msg, deliveryStatus: 'sending' }
    appendAnonymousMessage(groupId, sending)
    broadcastMessage(sending)

    try {
      await runWithPublishRetries(() => transport.publish(buildEnvelope(sending)))
      const sent: ChatMessage = { ...sending, deliveryStatus: 'sent' }
      replaceAnonymousMessage(groupId, sent)
      broadcastMessage(sent)
      return sent
    } catch {
      const failed: ChatMessage = { ...sending, deliveryStatus: 'failed' }
      replaceAnonymousMessage(groupId, failed)
      broadcastMessage(failed)
      return failed
    }
  }

  insertMessage(db, msg)
  broadcastMessage(msg)

  try {
    await runWithPublishRetries(() => transport.publish(buildEnvelope(msg)))
    updateDeliveryStatus(db, msg.msgId, 'sent')
    const sent: ChatMessage = { ...msg, deliveryStatus: 'sent' }
    broadcastMessage(sent)
    return sent
  } catch {
    updateDeliveryStatus(db, msg.msgId, 'failed')
    const failed: ChatMessage = { ...msg, deliveryStatus: 'failed' }
    broadcastMessage(failed)
    return failed
  }
}

/** 手动重试：仅本机发送失败的消息 */
export async function retryFailedMessage(db: Database, msgId: string): Promise<ChatMessage> {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throwLanpm('stub.identityRequired')
  }

  const existing = getMessageById(db, msgId)
  if (!existing) throwLanpm('stub.messageNotFound')
  if (existing.senderUserId !== status.user.userId) throwLanpm('err.chatRetryNotOwner')
  if (existing.deliveryStatus !== 'failed' && existing.deliveryStatus !== 'sending') {
    throwLanpm('err.chatRetryInvalidStatus')
  }

  const transport = getNetworkTransport()
  if (!transport) throwLanpm('err.networkNotReady')

  ensureSubscribed(db, transport, existing.groupId)

  updateDeliveryStatus(db, msgId, 'sending')
  const sending: ChatMessage = { ...existing, deliveryStatus: 'sending' }
  broadcastMessage(sending)

  try {
    await runWithPublishRetries(() => transport.publish(buildEnvelope(sending)))
    updateDeliveryStatus(db, msgId, 'sent')
    const sent: ChatMessage = { ...sending, deliveryStatus: 'sent' }
    broadcastMessage(sent)
    return sent
  } catch {
    updateDeliveryStatus(db, msgId, 'failed')
    const failed: ChatMessage = { ...sending, deliveryStatus: 'failed' }
    broadcastMessage(failed)
    return failed
  }
}

export async function sendTextMessage(
  db: Database,
  groupId: string,
  text: string
): Promise<ChatMessage> {
  const trimmed = text.trim()
  if (!trimmed) throwLanpm('stub.messageEmpty')
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

export { listGroupMembers, recallMessage }

export async function pickAndSendFileMessage(
  db: Database,
  groupId: string,
  parent?: BrowserWindow | null
): Promise<ChatMessage | null> {
  const result = await showOpenDialog(parent, { properties: ['openFile'] })
  if (result.canceled || !result.filePaths[0]) return null
  return sendFileMessage(db, groupId, result.filePaths[0])
}

export async function sendFileMessage(
  db: Database,
  groupId: string,
  sourcePath: string
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousNoFile')
  }
  const meta = await uploadFileFromPath(db, groupId, sourcePath)
  return sendExistingFileMessage(db, groupId, meta.fileId)
}

export async function sendExistingFileMessage(
  db: Database,
  groupId: string,
  fileId: string
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousNoFile')
  }
  const meta = getFileById(db, fileId)
  if (!meta) throwLanpm('err.fileNotFound')
  if (meta.groupId !== groupId) throwLanpm('err.fileWrongGroup')
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
    throwLanpm('err.anonymousTextOnly')
  }
  const trimmed = code.trim()
  if (!trimmed) throwLanpm('stub.codeEmpty')
  const language = detectLanguage(trimmed, languageHint)
  return publishChatMessage(db, groupId, 'code', {
    kind: 'code',
    language,
    code: trimmed,
    theme
  })
}

export async function sendTaskRefMessage(
  db: Database,
  groupId: string,
  taskId: string
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousTextOnly')
  }
  assertGroupAllowsTasks(resolveGroupType(db, groupId))
  const task = getTaskById(db, taskId)
  if (!task || task.groupId !== groupId) {
    throwLanpm('stub.taskNotFound')
  }
  return publishChatMessage(db, groupId, 'task_ref', {
    kind: 'task_ref',
    taskId: task.taskId,
    title: task.title
  })
}

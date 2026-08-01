import { randomUUID } from 'crypto'
import type { Database } from 'better-sqlite3'
import type { BrowserWindow } from 'electron'
import type { DmMessagePreview } from '../../shared/chat/dmPreview'
import { VOICE_MESSAGE_MAX_MS } from '../../shared/chat/voiceMessage'
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
import { uploadFileFromPath, uploadFileFromBuffer } from '../file/fileService'
import { getFileById } from '../storage/repositories/fileRepository'
import { getTaskById } from '../storage/repositories/taskRepository'
import { mergeLinkedFileId } from '../../shared/task/linkFile.ts'
import { updateGroupTask } from '../task/taskService.ts'
import type { SendFileOptions } from '../../shared/chat/channels'
import { assertGroupAllowsTasks } from '../../shared/group/guards'
import { showOpenDialog } from '../systemDialog'
import { readFileSync, existsSync } from 'node:fs'
import { initFileSyncService, shutdownFileSyncService } from '../file/fileSyncService'
import { initOpsSyncService, shutdownOpsSyncService, listOpsMachines, publishOpsInbound } from '../ops/opsSyncService'
import { scheduleOpsBotReply } from '../ops/opsBotService.ts'
import { initReadReceiptService, shutdownReadReceiptService } from './readReceiptService'
import {
  initJoinRequestService,
  shutdownJoinRequestService
} from '../group/joinRequestService'
import { initMediaSignalService, shutdownMediaSignalService } from '../media/mediaSignalService'
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
import { catchSyncFailure } from '../utils/reportSyncFailure'
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
  listDmMessagePreviews,
  listMessagesBeforePage,
  listRecentMessagesPage,
  messageExists,
  updateDeliveryStatus
} from '../storage/repositories/messageRepository'
import { handleChatRecall, recallMessage } from './recallMessageService'
import { handleChatEdit, editTextMessage } from './editMessageService'
import {
  handleChatPin,
  listPinnedMessageIds,
  togglePinnedMessage
} from './pinMessageService'
import {
  buildForwardedTextContent,
  canForwardMessage,
  cloneContentForForward,
  forwardedFromForMessage
} from '../../shared/chat/forwardMessage'

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
    void handleChatSyncRequest(db, envelope).catch(
      catchSyncFailure('chat.handleChatSyncRequest', { notify: false })
    )
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
  if (envelope.type === 'chat_edit') {
    handleChatEdit(db, envelope)
    return
  }
  if (envelope.type === 'chat_pin') {
    handleChatPin(db, envelope)
    return
  }
  if (envelope.type === 'read_receipt_sync_request') {
    void handleReadReceiptSyncRequest(db, envelope).catch(
      catchSyncFailure('chat.handleReadReceiptSyncRequest', { notify: false })
    )
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
  initJoinRequestService(db)
  initMediaSignalService(db)
  initGroupKeyService(db)
  ensureLocalRetentionMeta(db)
  initMessageRetentionScheduler(db)
  initTaskSyncService(db)
  initWhiteboardSyncService(db)
  initFileSyncService(db)
  initOpsSyncService(db)
  void requestOfflineSync(db).catch(catchSyncFailure('chat.requestOfflineSync', { notify: false }))
  void requestReadReceiptOfflineSync(db).catch(
    catchSyncFailure('chat.requestReadReceiptOfflineSync', { notify: false })
  )
}

export function shutdownChatService(): void {
  shutdownMessageRetentionScheduler()
  shutdownTaskSyncService()
  shutdownWhiteboardSyncService()
  shutdownFileSyncService()
  shutdownOpsSyncService()
  shutdownGroupKeyService()
  shutdownReadReceiptService()
  shutdownJoinRequestService()
  shutdownMediaSignalService()
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

/** DM session list — latest message per `dm:%` group without loading full histories. */
export function listDmPreviews(db: Database): DmMessagePreview[] {
  return listDmMessagePreviews(db)
}

export interface PublishChatMessageOptions {
  replyToMsgId?: string
  senderOverride?: { userId: string; deviceId: string }
}

export async function publishChatMessage(
  db: Database,
  groupId: string,
  type: MessageType,
  content: MessageContent,
  mentions?: string[],
  options?: PublishChatMessageOptions
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
  const senderUserId = options?.senderOverride?.userId ?? status.user.userId
  const senderDeviceId = options?.senderOverride?.deviceId ?? status.device.deviceId
  const msg: ChatMessage = {
    msgId: `msg_${randomUUID()}`,
    groupId,
    senderUserId,
    senderDeviceId,
    type,
    content,
    lamportTs,
    createdAt: now,
    deliveryStatus: 'sending',
    mentions: mentions?.length ? mentions : undefined,
    replyToMsgId: options?.replyToMsgId
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
  text: string,
  options?: PublishChatMessageOptions
): Promise<ChatMessage> {
  const trimmed = text.trim()
  if (!trimmed) throwLanpm('stub.messageEmpty')
  const members = await listGroupMembers(db, groupId)
  const mentions = parseMentions(trimmed, members)
  const msg = await publishChatMessage(
    db,
    groupId,
    'text',
    { kind: 'text', text: trimmed },
    mentions,
    options
  )
  if (mentions.length > 0) {
    scheduleOpsBotReply(db, groupId, trimmed, mentions)
  }
  return msg
}

/** Extension API v0.6 — markdown body as text message (renderer renders markdown). */
export async function sendMarkdownMessage(
  db: Database,
  groupId: string,
  markdown: string,
  options?: PublishChatMessageOptions
): Promise<ChatMessage> {
  const trimmed = markdown.trim()
  if (!trimmed) throwLanpm('stub.messageEmpty')
  const members = await listGroupMembers(db, groupId)
  const mentions = parseMentions(trimmed, members)
  return publishChatMessage(
    db,
    groupId,
    'text',
    { kind: 'text', text: trimmed },
    mentions,
    options
  )
}

export async function sendAiShareMessage(
  db: Database,
  groupId: string,
  markdown: string,
  aiThreadId?: string
): Promise<ChatMessage> {
  const trimmed = markdown.trim()
  if (!trimmed) throwLanpm('stub.messageEmpty')
  const text = trimmed.startsWith('**[AI 助手]**') ? trimmed : `**[AI 助手]**\n\n${trimmed}`
  return publishChatMessage(db, groupId, 'text', {
    kind: 'text',
    text,
    meta: {
      source: 'ai-assistant',
      ...(aiThreadId ? { aiThreadId } : {})
    }
  })
}

export { listGroupMembers, recallMessage, editTextMessage, listPinnedMessageIds, togglePinnedMessage }

export async function forwardMessageToGroup(
  db: Database,
  source: ChatMessage,
  targetGroupId: string,
  senderDisplayName?: string
): Promise<ChatMessage> {
  if (!canForwardMessage(source)) throwLanpm('err.chatForwardNotAllowed')
  const from = forwardedFromForMessage(source, senderDisplayName)
  if (source.content.kind === 'text') {
    const content = buildForwardedTextContent(source, from)
    return publishChatMessage(db, targetGroupId, 'text', content)
  }
  const cloned = cloneContentForForward(source.content)
  if (cloned.kind === 'text') {
    return publishChatMessage(db, targetGroupId, 'text', {
      ...cloned,
      meta: { ...cloned.meta, forwardedFrom: from }
    })
  }
  return publishChatMessage(db, targetGroupId, source.type, cloned)
}

function maybeLinkFileToTask(
  db: Database,
  groupId: string,
  fileId: string,
  linkTaskId?: string
): void {
  if (!linkTaskId) return
  const task = getTaskById(db, linkTaskId)
  if (!task || task.deletedAt || task.groupId !== groupId) return
  updateGroupTask(db, {
    taskId: linkTaskId,
    linkedFileIds: mergeLinkedFileId(task.linkedFileIds, fileId)
  })
}

export async function pickAndSendFileMessage(
  db: Database,
  groupId: string,
  parent?: BrowserWindow | null,
  options?: SendFileOptions
): Promise<ChatMessage | null> {
  const result = await showOpenDialog(parent, { properties: ['openFile'] })
  if (result.canceled || !result.filePaths[0]) return null
  return sendFileMessage(db, groupId, result.filePaths[0], options)
}

export async function sendFileMessage(
  db: Database,
  groupId: string,
  sourcePath: string,
  options?: SendFileOptions
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousNoFile')
  }
  const meta = await uploadFileFromPath(db, groupId, sourcePath)
  return sendExistingFileMessage(db, groupId, meta.fileId, options)
}

export async function sendExistingFileMessage(
  db: Database,
  groupId: string,
  fileId: string,
  options?: SendFileOptions
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousNoFile')
  }
  const meta = getFileById(db, fileId)
  if (!meta) throwLanpm('err.fileNotFound')
  if (meta.groupId !== groupId) throwLanpm('err.fileWrongGroup')
  const msg = await publishChatMessage(db, groupId, 'file', {
    kind: 'file',
    fileId: meta.fileId,
    fileName: meta.name,
    size: meta.size
  })

  const machines = listOpsMachines(groupId).filter((m) => m.online)
  if (machines.length > 0 && existsSync(meta.storagePath)) {
    const dataBase64 = readFileSync(meta.storagePath).toString('base64')
    for (const machine of machines) {
      await publishOpsInbound(
        db,
        groupId,
        machine.deviceId,
        meta.name,
        dataBase64,
        `${machine.inboundDir}/${meta.name}`
      )
    }
  }

  maybeLinkFileToTask(db, groupId, fileId, options?.linkTaskId)

  return msg
}

export async function sendVoiceMessage(
  db: Database,
  groupId: string,
  audioBase64: string,
  durationMs: number,
  mimeType = 'audio/webm'
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousNoFile')
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > VOICE_MESSAGE_MAX_MS) {
    throw new Error(`voice duration must be 1–${VOICE_MESSAGE_MAX_MS}ms`)
  }
  if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
    throw new Error('audio payload required')
  }
  const buffer = Buffer.from(audioBase64, 'base64')
  if (buffer.byteLength === 0) {
    throw new Error('audio payload empty')
  }
  const ext = mimeType.includes('ogg') ? 'ogg' : 'webm'
  const name = `voice-${Date.now()}.${ext}`
  const meta = await uploadFileFromBuffer(db, groupId, buffer, name)
  return publishChatMessage(db, groupId, 'voice', {
    kind: 'voice',
    fileId: meta.fileId,
    durationMs: Math.round(durationMs),
    mimeType
  })
}

export async function sendCodeMessage(
  db: Database,
  groupId: string,
  code: string,
  languageHint?: string,
  theme?: 'light' | 'dark',
  options?: PublishChatMessageOptions
): Promise<ChatMessage> {
  if (isAnonymousGroup(db, groupId)) {
    throwLanpm('err.anonymousTextOnly')
  }
  const trimmed = code.trim()
  if (!trimmed) throwLanpm('stub.codeEmpty')
  const language = detectLanguage(trimmed, languageHint)
  return publishChatMessage(
    db,
    groupId,
    'code',
    {
      kind: 'code',
      language,
      code: trimmed,
      theme
    },
    undefined,
    options
  )
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

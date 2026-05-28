import type { ChatMessage } from '@shared/chat/types'
import type { GroupMemberView } from '@shared/chat/members'
import { parseMentions } from '@shared/chat/mentions'
import { detectLanguage } from '@shared/chat/detectLanguage'
import { isDmGroupId, parseDmGroupId } from '@shared/chat/dmSession'
import type { SetupInput, SetupStatus } from '@shared/identity'
import { resolveDeviceName } from '@shared/identity/deviceName'

const BROWSER_PREVIEW_DEVICE = '开发预览'
import type { LanpmApi } from '@shared/lanpm-api'

const STORAGE_KEY = 'lanpm.dev.identity'
const CHAT_STORAGE_KEY = 'lanpm.dev.chat'

function readChatMessages(groupId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, ChatMessage[]>
    return all[groupId] ?? []
  } catch {
    return []
  }
}

function writeChatMessages(groupId: string, messages: ChatMessage[]): void {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, ChatMessage[]>) : {}
    all[groupId] = messages
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

const chatListeners = new Set<(message: ChatMessage) => void>()

const STUB_MEMBERS: GroupMemberView[] = [
  { userId: 'demo-alice', displayName: 'Alice', mentionKeys: ['alice'] },
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] }
]

function listStubMembers(groupId?: string): GroupMemberView[] {
  const status = readStatus()
  const members = [...STUB_MEMBERS]
  if (status.configured && status.user) {
    members.push({
      userId: status.user.userId,
      displayName: status.user.displayName,
      mentionKeys: [status.user.baseName, status.user.userId]
    })
  }

  if (groupId && isDmGroupId(groupId)) {
    const pair = parseDmGroupId(groupId)
    if (!pair) return []
    const [userA, userB] = pair
    const byId = new Map(members.map((m) => [m.userId, m]))
    return [userA, userB].map(
      (userId) =>
        byId.get(userId) ?? { userId, displayName: userId, mentionKeys: [userId] }
    )
  }

  return members
}

function readStatus(): SetupStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { configured: false }
    const parsed = JSON.parse(raw) as SetupStatus
    if (typeof parsed.configured === 'boolean') return parsed
  } catch {
    /* ignore */
  }
  return { configured: false }
}

function writeStatus(status: SetupStatus): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(status))
}

/** 浏览器直连 Vite 时的身份 API 桩（无 Electron preload） */
function previewDeviceName(): string {
  return resolveDeviceName('', BROWSER_PREVIEW_DEVICE)
}

export function createBrowserLanpmStub(): LanpmApi {
  return {
    platform: 'browser',
    versions: {
      node: 'dev',
      chrome: 'dev',
      electron: 'dev'
    },
    getSuggestedDeviceName: previewDeviceName,
    identity: {
      getSetupStatus: async () => {
        const status = readStatus()
        if (!status.configured) {
          return {
            ...status,
            suggestedDeviceName: previewDeviceName()
          }
        }
        return status
      },
      completeSetup: async (input: SetupInput) => {
        const deviceName = previewDeviceName()
        const suffix = new Date().toISOString().slice(2, 4) + String(new Date().getMonth() + 1).padStart(2, '0')
        const userId = `${input.baseName}-${suffix}`
        const status: SetupStatus = {
          configured: true,
          user: {
            userId,
            displayName: input.baseName,
            baseName: input.baseName,
            suffix,
            department: input.department,
            avatarUrl: input.avatarUrl
          },
          device: {
            deviceId: `dev-${crypto.randomUUID().slice(0, 8)}`,
            deviceName
          }
        }
        writeStatus(status)
        return status
      }
    },
    chat: {
      listMessages: async (groupId) => readChatMessages(groupId),
      sendText: async (groupId, text) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw new Error('请先完成身份配置')
        }
        const trimmed = text.trim()
        if (!trimmed) throw new Error('消息不能为空')
        const members = listStubMembers()
        const mentions = parseMentions(trimmed, members)
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const msg: ChatMessage = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'text',
          content: { kind: 'text', text: trimmed },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent',
          mentions: mentions.length ? mentions : undefined
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      sendCode: async (groupId, code, languageHint, theme) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw new Error('请先完成身份配置')
        }
        const trimmed = code.trim()
        if (!trimmed) throw new Error('代码不能为空')
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const language = detectLanguage(trimmed, languageHint)
        const msg: ChatMessage = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'code',
          content: { kind: 'code', language, code: trimmed, theme },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent'
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      listMembers: async (groupId) => listStubMembers(groupId),
      onMessage: (handler) => {
        chatListeners.add(handler)
        return () => chatListeners.delete(handler)
      }
    }
  }
}

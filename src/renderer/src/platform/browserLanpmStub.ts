import type { ChatMessage } from '@shared/chat/types'
import { CHAT_HISTORY_PAGE_SIZE } from '@shared/chat/pagination'
import type { GroupMemberView } from '@shared/chat/members'
import { canRecallMessage, toRecalledMessage } from '@shared/chat/recall'
import type { SendChatOptions } from '@shared/chat/channels'
import { canEditMessage } from '@shared/chat/messageEdit'
import {
  canForwardMessage,
  buildForwardedTextContent,
  forwardedFromForMessage,
  cloneContentForForward
} from '@shared/chat/forwardMessage'
import { togglePinId, mergePinPayload, type ChatPinPayload } from '@shared/chat/pin'
import { parseMentions } from '@shared/chat/mentions'
import { detectLanguage } from '@shared/chat/detectLanguage'
import { isDmGroupId, parseDmGroupId } from '@shared/chat/dmSession'
import { dmPreviewFromMessage } from '@shared/chat/dmPreview'
import { lastChatMessage } from '@shared/chat/messagePreview'
import type { UserPresence } from '@shared/network/types'
import { parseHostPort } from '@shared/network/manualPeer'
import type { ProfileUpdateInput, SetupInput, SetupStatus } from '@shared/identity'
import { resolveDeviceName } from '@shared/identity/deviceName'

import type { LanpmApi } from '@shared/lanpm-api'
import { DEFAULT_GROUP_AUTO_DISCOVER } from '@shared/group/types'
import { randomAvatarDataUrl } from '@renderer/features/setup/avatar'
import { isMessageReadByOthers } from '@shared/chat/readReceipt'
import type { FileMeta } from '@shared/file/types'
import type {
  CreateMindmapInput,
  ExportMindmapPngInput,
  MindmapDocument,
  MindmapDocumentLoad,
  RenameMindmapInput,
  SaveMindmapInput
} from '@shared/mindmap/types'
import { emptyMindmapDataJson, mindmapFileName } from '@shared/mindmap/types'
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '@shared/task/types'
import { applyAggregatedProgress } from '@shared/task/progress'
import {
  clampProgressPercent,
  normalizeTaskTitle,
  validateOtherReason,
  validateTaskDateRange,
  validateTaskTitle
} from '@shared/task/validation'
import { resolveStoryPointsPatch } from '@shared/task/storyPoints'
import { filterTagsToGroupDict } from '@shared/task/tags'
import { normalizeLinkedFileIds } from '@shared/task/linkedFiles'
import { collectTaskDiscussions } from '@shared/task/discussions'
import {
  checklistProgressOf,
  type ChecklistItem,
  type ChecklistView,
  type UpsertChecklistItemInput
} from '@shared/task/checklist'
import { countMineOpenTasks } from '@shared/badge/mineOpen'
import type { GroupTagMeta } from '@shared/task/groupTagMeta'
import { isGroupTagColor, normalizeGroupTagKey } from '@shared/task/groupTagMeta'
import type { SaveWhiteboardSceneInput, WhiteboardScene } from '@shared/whiteboard/types'
import { buildWhiteboardScene, emptyWhiteboardSceneJson, normalizeSceneJson } from '@shared/whiteboard/types'
import type { PluginView } from '@shared/plugin/types'
import { shouldBypassPaidPluginLicense } from '@shared/plugin/licenseDevBypass'
import { getDisallowedTaskPatchFields } from '@shared/plugin/taskPatchWhitelist'
import {
  isHumanReviewCapability,
  type CapabilityPendingConfirm,
  type HumanReviewCapabilityId
} from '@shared/plugin/capabilityConfirm'
import { parseTaskCreateInput } from '@shared/plugin/taskCreateWhitelist'
import { parseChatSendTextInput } from '@shared/plugin/chatSendTextWhitelist'
import { parseChatSendMarkdownInput } from '@shared/plugin/chatSendMarkdownWhitelist'
import { parseAiGetThreadInput } from '@shared/plugin/aiGetThreadWhitelist'
import { parseAiStreamChatCapabilityInput } from '@shared/plugin/aiStreamChatWhitelist'
import { parseFileUploadInput } from '@shared/plugin/fileUploadWhitelist'
import {
  DEFAULT_NAV_PREFERENCES,
  normalizeNavPreferences,
  normalizeNavPreferencesDocument,
  rawNavDocumentNeedsV196Writeback,
  type NavPreferences,
  type NavPreferencesDocument
} from '@shared/navigation/navPreferences'
import {
  isLiveKitConfigComplete,
  liveKitRoomNameForGroup,
  normalizeLiveKitConfig,
  toLiveKitConfigPublic,
  type LiveKitConfig
} from '@shared/media/livekitConfig'
import {
  createMeetingScheduleRecord,
  filterUpcomingSchedules,
  normalizeMeetingSchedule,
  sortSchedulesByStart,
  validateCreateMeetingScheduleInput,
  validateUpdateMeetingScheduleInput,
  applyMeetingScheduleUpdate,
  type MeetingSchedule
} from '@shared/media/meetingSchedule'
import { stubError, stubT } from '@renderer/platform/stubTranslate'

const STORAGE_KEY = 'lanpm.dev.identity'
const CHAT_STORAGE_KEY = 'lanpm.dev.chat'
const PIN_STORAGE_KEY = 'lanpm.dev.chatPins'
const TASK_STORAGE_KEY = 'lanpm.dev.tasks'
const CHECKLIST_STORAGE_KEY = 'lanpm.dev.checklists'
const READ_RECEIPT_KEY = 'lanpm.dev.readReceipts'
const FILE_STORAGE_KEY = 'lanpm.dev.files'
const WHITEBOARD_STORAGE_KEY = 'lanpm.dev.whiteboard'
const MINDMAP_STORAGE_KEY = 'lanpm.dev.mindmap'
const STUB_DISSOLVED_GROUPS_KEY = 'lanpm.dev.dissolvedGroups'
const NAV_PREFS_STORAGE_KEY = 'lanpm.dev.navPreferences'
const LIVEKIT_CONFIG_STORAGE_KEY = 'lanpm.dev.livekitConfig'
const MEETING_SCHEDULES_STORAGE_KEY = 'lanpm.dev.meetingSchedules'

function readStubMeetingSchedules(): MeetingSchedule[] {
  try {
    const raw = localStorage.getItem(MEETING_SCHEDULES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeMeetingSchedule(item))
      .filter((item): item is MeetingSchedule => item !== null)
  } catch {
    return []
  }
}

function writeStubMeetingSchedules(schedules: MeetingSchedule[]): MeetingSchedule[] {
  const sorted = sortSchedulesByStart(schedules)
  localStorage.setItem(MEETING_SCHEDULES_STORAGE_KEY, JSON.stringify(sorted))
  return sorted
}

function readStubNavDocument(): NavPreferencesDocument {
  try {
    const raw = localStorage.getItem(NAV_PREFS_STORAGE_KEY)
    if (!raw) return normalizeNavPreferencesDocument(DEFAULT_NAV_PREFERENCES)
    const parsed: unknown = JSON.parse(raw)
    const normalized = normalizeNavPreferencesDocument(parsed)
    if (rawNavDocumentNeedsV196Writeback(parsed)) {
      return writeStubNavDocument(normalized)
    }
    return normalized
  } catch {
    return normalizeNavPreferencesDocument(DEFAULT_NAV_PREFERENCES)
  }
}

function writeStubNavDocument(doc: NavPreferencesDocument): NavPreferencesDocument {
  const normalized = normalizeNavPreferencesDocument(doc)
  localStorage.setItem(NAV_PREFS_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

function readStubNavPreferences(): NavPreferences {
  return readStubNavDocument().global
}

function writeStubNavPreferences(prefs: NavPreferences): NavPreferences {
  const doc = readStubNavDocument()
  doc.global = normalizeNavPreferences(prefs)
  return writeStubNavDocument(doc).global
}

function readStubLiveKitConfig(): LiveKitConfig {
  try {
    const raw = localStorage.getItem(LIVEKIT_CONFIG_STORAGE_KEY)
    if (!raw) return normalizeLiveKitConfig({})
    return normalizeLiveKitConfig(JSON.parse(raw) as unknown)
  } catch {
    return normalizeLiveKitConfig({})
  }
}

function writeStubLiveKitConfig(input: LiveKitConfig): ReturnType<typeof toLiveKitConfigPublic> {
  const normalized = normalizeLiveKitConfig(input)
  localStorage.setItem(LIVEKIT_CONFIG_STORAGE_KEY, JSON.stringify(normalized))
  return toLiveKitConfigPublic(normalized)
}

const STUB_PLUGIN_LICENSES_KEY = 'lanpm.stub.pluginLicenses'

function readStubPluginLicenses(): Record<string, { features: string[]; expiresAt?: number }> {
  try {
    const raw = localStorage.getItem(STUB_PLUGIN_LICENSES_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, { features: string[]; expiresAt?: number }>
  } catch {
    return {}
  }
}

function writeStubPluginLicenses(map: Record<string, { features: string[]; expiresAt?: number }>): void {
  localStorage.setItem(STUB_PLUGIN_LICENSES_KEY, JSON.stringify(map))
}

function isStubPluginLicensed(pluginId: string): boolean {
  if (shouldBypassPaidPluginLicense()) return true
  const grant = readStubPluginLicenses()[pluginId]
  if (!grant) return false
  if (grant.expiresAt != null && grant.expiresAt <= Date.now()) return false
  return grant.features.length > 0
}

function refreshStubPluginLicenseFields(): void {
  for (let i = 0; i < STUB_PLUGINS.length; i++) {
    const p = STUB_PLUGINS[i]!
    STUB_PLUGINS[i] = {
      ...p,
      licensed: p.pricing === 'free' ? null : isStubPluginLicensed(p.id)
    }
  }
}

type StubCapabilityPending = {
  pluginId: string
  capability: HumanReviewCapabilityId
  args: Record<string, unknown>
  userId: string
}

const stubCapabilityPendings = new Map<string, StubCapabilityPending>()

function executeStubWriteCapability(
  capability: HumanReviewCapabilityId,
  args: Record<string, unknown>
): unknown {
  if (capability === 'task.create') {
    const parsed = parseTaskCreateInput(args)
    if (!parsed.ok) throw new Error(parsed.message)
    return stubCreateTask(parsed.value)
  }
  if (capability === 'task.patch') {
    const groupId = String(args.groupId ?? '')
    const taskId = String(args.taskId ?? '')
    const patch = args.patch
    if (!groupId) throw new Error('groupId required')
    if (!taskId) throw new Error('taskId required')
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new Error('patch required')
    }
    const disallowed = getDisallowedTaskPatchFields(patch as Record<string, unknown>)
    if (disallowed.length > 0) {
      throw new Error(`patch field not allowed: ${disallowed.join(', ')}`)
    }
    const all = readAllTasks()
    const list = all[groupId] ?? []
    if (!list.some((t) => t.taskId === taskId && !t.deletedAt)) {
      throw stubError('stub.taskNotFound')
    }
    const patchBody = patch as {
      title?: string
      status?: TaskStatus
      progressPercent?: number
      priority?: Task['priority']
      tags?: string[]
      storyPoints?: number | null
    }
    return stubUpdateTask({
      taskId,
      ...patchBody
    })
  }
  if (capability === 'board.moveTask') {
    const groupId = String(args.groupId ?? '')
    const taskId = String(args.taskId ?? '')
    const status = args.status as TaskStatus | undefined
    if (!groupId) throw new Error('groupId required')
    if (!taskId) throw new Error('taskId required')
    if (!status) throw new Error('status required')
    const all = readAllTasks()
    const list = all[groupId] ?? []
    if (!list.some((t) => t.taskId === taskId && !t.deletedAt)) {
      throw stubError('stub.taskNotFound')
    }
    const existing = list.find((t) => t.taskId === taskId)!
    const sortOrder =
      args.sortOrder != null && Number.isFinite(Number(args.sortOrder))
        ? Number(args.sortOrder)
        : status !== existing.status
          ? maxSortInColumn(list, status) + 1
          : existing.sortOrder
    return stubUpdateTask({
      taskId,
      status,
      sortOrder,
      otherReason:
        status === 'other' && args.otherReason != null
          ? String(args.otherReason)
          : status === 'other'
            ? existing.otherReason ?? null
            : null
    })
  }
  if (capability === 'chat.sendText') {
    const parsed = parseChatSendTextInput(args)
    if (!parsed.ok) throw new Error(parsed.message)
    const { groupId, text, replyToMsgId } = parsed.value
    const status = readStatus()
    if (!status.configured || !status.user || !status.device) {
      throw stubError('stub.identityRequired')
    }
    const prev = readChatMessages(groupId)
    const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
    const members = listStubMembers(groupId)
    const mentions = parseMentions(text, members)
    const msg: ChatMessage = {
      msgId: `msg_${crypto.randomUUID()}`,
      groupId,
      senderUserId: status.user.userId,
      senderDeviceId: status.device.deviceId,
      type: 'text',
      content: { kind: 'text', text },
      lamportTs,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sent',
      ...(mentions.length > 0 ? { mentions } : {}),
      ...(replyToMsgId ? { replyToMsgId } : {})
    }
    writeChatMessages(groupId, [...prev, msg])
    for (const fn of chatListeners) fn(msg)
    return msg
  }
  if (capability === 'chat.sendMarkdown') {
    const parsed = parseChatSendMarkdownInput(args)
    if (!parsed.ok) throw new Error(parsed.message)
    const { groupId, markdown, replyToMsgId } = parsed.value
    const status = readStatus()
    if (!status.configured || !status.user || !status.device) {
      throw stubError('stub.identityRequired')
    }
    const prev = readChatMessages(groupId)
    const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
    const members = listStubMembers(groupId)
    const mentions = parseMentions(markdown, members)
    const msg: ChatMessage = {
      msgId: `msg_${crypto.randomUUID()}`,
      groupId,
      senderUserId: status.user.userId,
      senderDeviceId: status.device.deviceId,
      type: 'text',
      content: { kind: 'text', text: markdown },
      lamportTs,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sent',
      ...(mentions.length > 0 ? { mentions } : {}),
      ...(replyToMsgId ? { replyToMsgId } : {})
    }
    writeChatMessages(groupId, [...prev, msg])
    for (const fn of chatListeners) fn(msg)
    return msg
  }
  if (capability === 'ai.streamChat') {
    return { requestId: `stub_aireq_${crypto.randomUUID()}` }
  }
  if (capability === 'file.upload') {
    const parsed = parseFileUploadInput(args)
    if (!parsed.ok) throw new Error(parsed.message)
    const { groupId } = parsed.value
    const status = readStatus()
    if (!status.configured || !status.user) {
      throw stubError('stub.identityRequired')
    }
    const name = 'upload.bin'
    const ext = 'bin'
    const now = new Date().toISOString()
    const meta: FileMeta = {
      fileId: `stub_file_${crypto.randomUUID()}`,
      groupId,
      name,
      ext,
      category: 'other',
      size: 0,
      uploadedBy: status.user.userId,
      uploadedAt: now,
      sha256: '',
      storagePath: 'stub://upload.bin',
      previewStatus: 'none',
      isBookmark: false,
      updatedAt: now
    }
    const files = readAllFiles()[groupId] ?? []
    writeGroupFiles(groupId, [...files, meta])
    return meta
  }
  if (capability === 'chat.sendTaskRef') {
    const groupId = String(args.groupId ?? '')
    const taskId = String(args.taskId ?? '')
    if (!groupId) throw new Error('groupId required')
    if (!taskId) throw new Error('taskId required')
    const all = readAllTasks()
    const list = all[groupId] ?? []
    const task = list.find((t) => t.taskId === taskId && !t.deletedAt)
    if (!task) throw stubError('stub.taskNotFound')
    const status = readStatus()
    if (!status.configured || !status.user || !status.device) {
      throw stubError('stub.identityRequired')
    }
    const prev = readChatMessages(groupId)
    const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
    const msg: ChatMessage = {
      msgId: `msg_${crypto.randomUUID()}`,
      groupId,
      senderUserId: status.user.userId,
      senderDeviceId: status.device.deviceId,
      type: 'task_ref',
      content: { kind: 'task_ref', taskId: task.taskId, title: task.title },
      lamportTs,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sent'
    }
    writeChatMessages(groupId, [...prev, msg])
    for (const fn of chatListeners) fn(msg)
    return msg
  }
  if (capability === 'ops.command.send') {
    return { ok: true, stub: true }
  }
  if (capability === 'media.livekit.createToken') {
    const config = readStubLiveKitConfig()
    const groupId = String(args.groupId ?? '')
    const identity = String(args.identity ?? '')
    if (!isLiveKitConfigComplete(config) || !groupId || !identity) {
      throw new Error('LiveKit not configured')
    }
    return {
      token: 'stub-livekit-token',
      url: config.url,
      roomName: liveKitRoomNameForGroup(groupId)
    }
  }
  const _exhaustive: never = capability
  throw new Error(`unknown write capability: ${_exhaustive}`)
}

const STUB_PLUGINS: PluginView[] = [
  {
    id: 'lanpm.example',
    name: 'Example Slot Stub',
    version: '0.5.0',
    slots: ['task.detail.section', 'chat.composer.action'],
    capabilities: [
      'task.get',
      'task.list',
      'chat.listMessages',
      'task.getChecklist',
      'member.list',
      'chat.sendTaskRef',
      'chat.sendText',
      'file.upload',
      'task.create',
      'task.patch',
      'board.moveTask',
      'license.feature'
    ],
    pricing: 'free',
    enabled: true,
    dirName: 'lanpm.example',
    source: 'builtin',
    signatureValid: true,
    licensed: null,
    commands: [{ id: 'hello', titleKey: 'command.example.hello' }],
    menus: [
      { location: 'topbar.user', items: [{ command: 'hello' }] },
      { location: 'chat.message.context', items: [{ command: 'hello' }] }
    ]
  },
  {
    id: 'lanpm.mindmap',
    name: 'Mind Map',
    version: '0.1.0',
    slots: ['mindmap.toolbar'],
    capabilities: ['task.list', 'license.feature'],
    pricing: 'paid',
    enabled: true,
    dirName: 'lanpm.mindmap',
    source: 'builtin',
    signatureValid: true,
    licensed: false,
    contributions: {
      views: [
        {
          id: 'mindmap',
          route: 'mindmap',
          titleKey: 'nav.mindmap',
          icon: 'apartment',
          groupTypes: ['project'],
          pricing: 'paid'
        }
      ]
    }
  },
  {
    id: 'lanpm.weekly',
    name: 'LanPM Weekly',
    version: '0.1.0',
    slots: ['topbar.menu'],
    capabilities: ['license.feature'],
    pricing: 'paid',
    enabled: false,
    dirName: 'lanpm.weekly',
    source: 'builtin',
    signatureValid: true,
    licensed: false
  }
]

refreshStubPluginLicenseFields()

function listStubCommands(): import('@shared/plugin/commands').ListedCommand[] {
  const listed: import('@shared/plugin/commands').ListedCommand[] = [
    {
      commandId: 'core:open-profile',
      titleKey: 'command.core.openProfile',
      source: 'core',
      pluginId: null,
      enabled: true
    },
    {
      commandId: 'core:open-nav-preferences',
      titleKey: 'command.core.openNavPreferences',
      source: 'core',
      pluginId: null,
      enabled: true
    },
    {
      commandId: 'core:open-plugins',
      titleKey: 'command.core.openPlugins',
      source: 'core',
      pluginId: null,
      enabled: true
    }
  ]
  for (const plugin of STUB_PLUGINS) {
    if (!plugin.enabled) continue
    for (const cmd of plugin.commands ?? []) {
      listed.push({
        commandId: `${plugin.id}:${cmd.id}`,
        titleKey: cmd.titleKey,
        source: 'plugin',
        pluginId: plugin.id,
        enabled: true
      })
    }
  }
  return listed
}

function listStubMenus(): import('@shared/plugin/menus').ListedMenuItem[] {
  const listed: import('@shared/plugin/menus').ListedMenuItem[] = []
  for (const plugin of STUB_PLUGINS) {
    if (!plugin.enabled) continue
    const titleByCommandId = new Map(
      (plugin.commands ?? []).map((cmd) => [cmd.id, cmd.titleKey] as const)
    )
    for (const menu of plugin.menus ?? []) {
      for (const item of menu.items) {
        const titleKey = titleByCommandId.get(item.command)
        if (!titleKey) continue
        listed.push({
          location: menu.location,
          commandId: `${plugin.id}:${item.command}`,
          titleKey,
          source: 'plugin',
          pluginId: plugin.id,
          enabled: true
        })
      }
    }
  }
  return listed
}

function mutateStubPluginEnabled(pluginId: string, enabled: boolean): PluginView[] {
  const idx = STUB_PLUGINS.findIndex((p) => p.id === pluginId)
  if (idx < 0) throw new Error(`plugin not found: ${pluginId}`)
  const cur = STUB_PLUGINS[idx]!
  STUB_PLUGINS[idx] = { ...cur, enabled }
  return STUB_PLUGINS.slice()
}

const stubDissolvedGroups = new Set<string>(
  (() => {
    try {
      const raw = localStorage.getItem(STUB_DISSOLVED_GROUPS_KEY)
      if (!raw) return []
      return JSON.parse(raw) as string[]
    } catch {
      return []
    }
  })()
)

function persistStubDissolvedGroups(): void {
  localStorage.setItem(STUB_DISSOLVED_GROUPS_KEY, JSON.stringify([...stubDissolvedGroups]))
}

const taskListeners = new Set<(groupId: string) => void>()
const groupTagListeners = new Set<(groupId: string) => void>()
const stubGroupTags: Record<string, GroupTagMeta[]> = {}
let stubDiscoverSeeds: string[] = []

function readStubWhiteboards(): Record<string, WhiteboardScene> {
  try {
    const raw = localStorage.getItem(WHITEBOARD_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, WhiteboardScene>
  } catch {
    return {}
  }
}

function writeStubWhiteboard(scene: WhiteboardScene): void {
  const all = readStubWhiteboards()
  all[scene.groupId] = scene
  localStorage.setItem(WHITEBOARD_STORAGE_KEY, JSON.stringify(all))
}

interface StubMindmapDoc extends MindmapDocument {
  dataJson: string
}

function readStubMindmaps(): StubMindmapDoc[] {
  try {
    const raw = localStorage.getItem(MINDMAP_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as StubMindmapDoc[]) : []
  } catch {
    return []
  }
}

function writeStubMindmaps(docs: StubMindmapDoc[]): void {
  localStorage.setItem(MINDMAP_STORAGE_KEY, JSON.stringify(docs))
}

function toMindmapMeta(doc: StubMindmapDoc): MindmapDocument {
  const { dataJson: _omit, ...meta } = doc
  void _omit
  return meta
}

function assertStubTaskWritable(groupId: string): void {
  if (groupId.startsWith('dm:')) throw stubError('stub.dmNoTask')
  if (groupId === 'demo-anonymous') throw stubError('stub.anonymousNoTask')
  if (groupId === 'demo-function') throw stubError('stub.functionNoTask')
}

function readAllTasks(): Record<string, Task[]> {
  try {
    const raw = localStorage.getItem(TASK_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, Task[]>
  } catch {
    return {}
  }
}

function writeGroupTasks(groupId: string, tasks: Task[]): void {
  const all = readAllTasks()
  all[groupId] = tasks
  localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(all))
  for (const fn of taskListeners) fn(groupId)
}

function readAllChecklists(): Record<string, ChecklistItem[]> {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, ChecklistItem[]>
  } catch {
    return {}
  }
}

function writeTaskChecklist(taskId: string, items: ChecklistItem[]): void {
  const all = readAllChecklists()
  all[taskId] = items
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(all))
}

function stubListChecklist(groupId: string, taskId: string): ChecklistView {
  assertStubTaskWritable(groupId)
  const list = readAllTasks()[groupId] ?? []
  const task = list.find((t) => t.taskId === taskId && !t.deletedAt)
  if (!task) throw stubError('stub.taskNotFound')
  const items = readAllChecklists()[taskId] ?? []
  return {
    checklist: items.length
      ? {
          checklistId: `cl_stub_${taskId}`,
          taskId,
          groupId,
          title: '',
          createdAt: items[0]!.createdAt,
          updatedAt: items[items.length - 1]!.updatedAt
        }
      : null,
    items,
    progress: checklistProgressOf(items)
  }
}

function stubUpsertChecklistItem(input: UpsertChecklistItemInput): ChecklistItem {
  assertStubTaskWritable(input.groupId)
  const list = readAllTasks()[input.groupId] ?? []
  const task = list.find((t) => t.taskId === input.taskId && !t.deletedAt)
  if (!task) throw stubError('stub.taskNotFound')
  const text = input.text.trim()
  if (!text) throw new Error('checklist item text required')
  const items = [...(readAllChecklists()[input.taskId] ?? [])]
  const now = new Date().toISOString()
  if (input.itemId) {
    const idx = items.findIndex((i) => i.itemId === input.itemId)
    if (idx < 0) throw stubError('stub.taskNotFound')
    const prev = items[idx]!
    const next: ChecklistItem = {
      ...prev,
      text,
      done: input.done ?? prev.done,
      sortOrder: input.sortOrder ?? prev.sortOrder,
      linkedSubtaskId:
        input.linkedSubtaskId === undefined
          ? prev.linkedSubtaskId
          : (input.linkedSubtaskId ?? undefined),
      updatedAt: now
    }
    items[idx] = next
    writeTaskChecklist(input.taskId, items)
    for (const fn of taskListeners) fn(input.groupId)
    return next
  }
  const item: ChecklistItem = {
    itemId: `cli_${crypto.randomUUID()}`,
    checklistId: `cl_stub_${input.taskId}`,
    taskId: input.taskId,
    text,
    done: input.done ?? false,
    sortOrder: input.sortOrder ?? items.length,
    linkedSubtaskId: input.linkedSubtaskId ?? undefined,
    createdAt: now,
    updatedAt: now
  }
  items.push(item)
  writeTaskChecklist(input.taskId, items)
  for (const fn of taskListeners) fn(input.groupId)
  return item
}

function maxSortInColumn(tasks: Task[], status: TaskStatus): number {
  return tasks.filter((t) => t.status === status).reduce((m, t) => Math.max(m, t.sortOrder), -1)
}

function stubCreateTask(input: CreateTaskInput): Task {
  assertStubTaskWritable(input.groupId)
  const status = readStatus()
  if (!status.configured || !status.user) throw stubError('stub.identityRequired')
  const titleErr = validateTaskTitle(input.title)
  if (titleErr) throw new Error(titleErr)
  const title = normalizeTaskTitle(input.title)
  const prev = readAllTasks()[input.groupId] ?? []
  const taskStatus = input.status ?? 'todo'
  const tags = filterTagsToGroupDict(input.tags ?? [], stubGroupTags[input.groupId] ?? [])
  const linked = normalizeLinkedFileIds(input.linkedFileIds ?? [])
  const sourceMsgId = input.sourceMsgId?.trim() || undefined
  const task: Task = {
    taskId: `task_${crypto.randomUUID()}`,
    groupId: input.groupId,
    parentTaskId: input.parentTaskId,
    title,
    status: taskStatus,
    priority: input.priority ?? 'medium',
    assigneeUserId: input.assigneeUserId,
    tags: tags.length > 0 ? tags : undefined,
    sourceMsgId,
    linkedFileIds: linked.length > 0 ? linked : undefined,
    progressPercent: clampProgressPercent(input.progressPercent ?? 0),
    sortOrder: maxSortInColumn(prev, taskStatus) + 1,
    createdBy: status.user.userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  const err = validateOtherReason(task.status, task.otherReason)
  if (err) throw new Error(err)
  writeGroupTasks(input.groupId, [...prev, task])
  return task
}

function stubUpdateTask(input: UpdateTaskInput): Task {
  const all = readAllTasks()
  let groupId = ''
  let tasks: Task[] = []
  for (const [gid, list] of Object.entries(all)) {
    if (list.some((t) => t.taskId === input.taskId)) {
      groupId = gid
      tasks = [...list]
      break
    }
  }
  if (!groupId) throw stubError('stub.taskNotFound')
  const idx = tasks.findIndex((t) => t.taskId === input.taskId)
  const existing = tasks[idx]!
  const nextStatus = input.status ?? existing.status
  const nextReason =
    input.otherReason !== undefined
      ? input.otherReason ?? undefined
      : input.status && input.status !== 'other'
        ? undefined
        : existing.otherReason
  const err = validateOtherReason(nextStatus, nextReason)
  if (err) throw new Error(err)
  if (input.title !== undefined) {
    const titleErr = validateTaskTitle(input.title)
    if (titleErr) throw new Error(titleErr)
  }
  const nextStart =
    input.startDate !== undefined ? input.startDate : existing.startDate ?? null
  const nextEnd = input.endDate !== undefined ? input.endDate : existing.endDate ?? null
  const dateErr = validateTaskDateRange(nextStart, nextEnd)
  if (dateErr) throw new Error(dateErr)
  tasks[idx] = {
    ...existing,
    title: input.title !== undefined ? normalizeTaskTitle(input.title) : existing.title,
    status: nextStatus,
    otherReason: nextReason,
    priority: input.priority ?? existing.priority,
    assigneeUserId:
      input.assigneeUserId === null
        ? undefined
        : input.assigneeUserId ?? existing.assigneeUserId,
    tags:
      input.tags !== undefined
        ? (() => {
            const filtered = filterTagsToGroupDict(
              input.tags,
              stubGroupTags[groupId] ?? []
            )
            return filtered.length > 0 ? filtered : undefined
          })()
        : existing.tags,
    sourceMsgId:
      input.sourceMsgId === null
        ? undefined
        : input.sourceMsgId !== undefined
          ? input.sourceMsgId
          : existing.sourceMsgId,
    linkedFileIds:
      input.linkedFileIds !== undefined
        ? (() => {
            const ids = normalizeLinkedFileIds(input.linkedFileIds)
            return ids.length > 0 ? ids : undefined
          })()
        : existing.linkedFileIds,
    progressPercent:
      input.progressPercent !== undefined
        ? clampProgressPercent(input.progressPercent)
        : existing.progressPercent,
    storyPoints: resolveStoryPointsPatch(input.storyPoints, existing.storyPoints),
    parentTaskId:
      input.parentTaskId === null
        ? undefined
        : input.parentTaskId ?? existing.parentTaskId,
    sortOrder: input.sortOrder ?? existing.sortOrder,
    startDate:
      input.startDate === null
        ? undefined
        : input.startDate !== undefined
          ? input.startDate
          : existing.startDate,
    endDate:
      input.endDate === null
        ? undefined
        : input.endDate !== undefined
          ? input.endDate
          : existing.endDate,
    milestone: input.milestone ?? existing.milestone,
    updatedAt: new Date().toISOString()
  }
  writeGroupTasks(groupId, tasks)
  return applyAggregatedProgress(tasks).find((t) => t.taskId === input.taskId)!
}

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

function listStubDmPreviews() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    const store = JSON.parse(raw) as Record<string, ChatMessage[]>
    const out = []
    for (const [groupId, messages] of Object.entries(store)) {
      if (!isDmGroupId(groupId)) continue
      const last = lastChatMessage(messages)
      if (!last) continue
      out.push(dmPreviewFromMessage(last))
    }
    return out
  } catch {
    return []
  }
}

function readPinPayload(groupId: string): ChatPinPayload | null {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, ChatPinPayload>
    return all[groupId] ?? null
  } catch {
    return null
  }
}

function writePinPayload(payload: ChatPinPayload): void {
  try {
    const raw = localStorage.getItem(PIN_STORAGE_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, ChatPinPayload>) : {}
    all[payload.groupId] = payload
    localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

function findMessageById(msgId: string): { groupId: string; message: ChatMessage } | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, ChatMessage[]>
    for (const [groupId, list] of Object.entries(all)) {
      const message = list.find((m) => m.msgId === msgId)
      if (message) return { groupId, message }
    }
  } catch {
    /* ignore */
  }
  return null
}

function readAllFiles(): Record<string, FileMeta[]> {
  try {
    const raw = localStorage.getItem(FILE_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, FileMeta[]>
  } catch {
    return {}
  }
}

function writeGroupFiles(groupId: string, files: FileMeta[]): void {
  try {
    const all = readAllFiles()
    all[groupId] = files
    localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

const chatListeners = new Set<(message: ChatMessage) => void>()

function readReceiptMap(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(READ_RECEIPT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function writeReceiptMap(map: Record<string, string[]>): void {
  localStorage.setItem(READ_RECEIPT_KEY, JSON.stringify(map))
}

function applyReadStatus(messages: ChatMessage[], localUserId?: string): ChatMessage[] {
  const receipts = readReceiptMap()
  return messages.map((m) => {
    if (m.senderUserId !== localUserId) return m
    const readers = receipts[m.msgId] ?? []
    if (isMessageReadByOthers(m.senderUserId, readers) && m.deliveryStatus !== 'read') {
      return { ...m, deliveryStatus: 'read' as const }
    }
    return m
  })
}

const STUB_MEMBERS: GroupMemberView[] = [
  { userId: 'demo-alice', displayName: 'Alice', mentionKeys: ['alice'] },
  { userId: 'demo-bob', displayName: 'Bob', mentionKeys: ['bob'] },
  { userId: 'demo-carol', displayName: 'Carol', mentionKeys: ['carol'] }
]

const STUB_PRESENCE: Record<string, UserPresence> = {
  'demo-alice': 'away',
  'demo-bob': 'offline',
  'demo-carol': 'online'
}

function stubPresence(userId: string, localUserId?: string): UserPresence {
  if (localUserId && userId === localUserId) return 'online'
  return STUB_PRESENCE[userId] ?? 'offline'
}

function listStubMembers(groupId?: string): GroupMemberView[] {
  const status = readStatus()
  const localUserId = status.configured && status.user ? status.user.userId : undefined
  const members = [...STUB_MEMBERS]
  if (status.configured && status.user) {
    members.push({
      userId: status.user.userId,
      displayName: status.user.displayName,
      avatarUrl: status.user.avatarUrl,
      mentionKeys: [status.user.baseName, status.user.userId]
    })
  }

  const attach = (list: GroupMemberView[]): GroupMemberView[] =>
    list.map((m) => ({ ...m, presence: stubPresence(m.userId, localUserId) }))

  if (groupId && isDmGroupId(groupId)) {
    const pair = parseDmGroupId(groupId)
    if (!pair) return []
    const [userA, userB] = pair
    const byId = new Map(members.map((m) => [m.userId, m]))
    return attach(
      [userA, userB].map(
        (userId) =>
          byId.get(userId) ?? { userId, displayName: userId, mentionKeys: [userId] }
      )
    )
  }

  return attach(members)
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

/** 浏览器预览默认身份，避免全屏遮罩挡住 #/g/.../chat 导致无法点击 */
function ensureDevPreviewIdentity(): SetupStatus {
  const existing = readStatus()
  if (existing.configured && existing.user && existing.device) {
    return existing
  }
  const status: SetupStatus = {
    configured: true,
    user: {
      userId: 'preview-user',
      displayName: stubT('stub.preview.displayName'),
      baseName: stubT('stub.preview.baseName'),
      suffix: '00',
      department: stubT('stub.preview.department'),
      avatarUrl: randomAvatarDataUrl(stubT('stub.preview.baseName'))
    },
    device: {
      deviceId: 'dev-preview',
      deviceName: previewDeviceName()
    }
  }
  writeStatus(status)
  return status
}

/** 浏览器直连 Vite 时的身份 API 桩（无 Electron preload） */
function previewDeviceName(): string {
  return resolveDeviceName('', stubT('stub.preview.deviceName'))
}

function readReadReceipts(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(READ_RECEIPT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, string[]>) : {}
  } catch {
    return {}
  }
}

function stubGroupTabBadges(groupId: string): import('@shared/badge/types').GroupTabBadges {
  const status = readStatus()
  const userId = status.user?.userId
  let chatUnread = 0
  if (userId) {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY)
      const store = raw
        ? (JSON.parse(raw) as Record<string, import('@shared/chat/types').ChatMessage[]>)
        : {}
      const receipts = readReadReceipts()
      for (const m of store[groupId] ?? []) {
        if (m.senderUserId === userId) continue
        const readers = receipts[m.msgId] ?? []
        if (!readers.includes(userId)) chatUnread++
      }
    } catch {
      /* ignore */
    }
  }
  const tasks = readAllTasks()[groupId] ?? []
  const boardMineOpen = userId ? countMineOpenTasks(tasks, userId) : 0
  let boardLatestUpdatedAt: string | null = null
  for (const t of tasks) {
    if (t.deletedAt) continue
    if (!boardLatestUpdatedAt || t.updatedAt > boardLatestUpdatedAt) {
      boardLatestUpdatedAt = t.updatedAt
    }
  }
  return { chatUnread, boardMineOpen, boardLatestUpdatedAt }
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
    onUserNotice: () => () => undefined,
    notification: {
      show: async (title, body) => {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(title, { body })
        }
      },
      onNavigate: () => () => undefined
    },
    locale: {
      get: async () =>
        (localStorage.getItem('locale') as 'zh-CN' | 'en-US') || 'zh-CN',
      set: async (locale) => {
        localStorage.setItem('locale', locale)
        return locale
      }
    },
    identity: {
      getSetupStatus: async () => {
        if (import.meta.env.DEV) {
          return ensureDevPreviewIdentity()
        }
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
      },
      updateProfile: async (input: ProfileUpdateInput) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const baseName = input.baseName.trim()
        const suffix = status.user.suffix
        const displayName = suffix ? `${baseName}${suffix}` : baseName
        const next: SetupStatus = {
          configured: true,
          user: {
            ...status.user,
            baseName,
            displayName,
            department: input.department?.trim() || undefined,
            avatarUrl: input.avatarUrl ?? status.user.avatarUrl
          },
          device: status.device
        }
        writeStatus(next)
        return next
      },
      resetIdentity: async () => {
        const status: SetupStatus = {
          configured: false,
          suggestedDeviceName: previewDeviceName()
        }
        writeStatus(status)
        return status
      }
    },
    chat: {
      listMessages: async (groupId) => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const all = applyReadStatus(readChatMessages(groupId), localUserId)
        const hasMore = all.length > CHAT_HISTORY_PAGE_SIZE
        const messages = hasMore ? all.slice(-CHAT_HISTORY_PAGE_SIZE) : all
        return { messages, hasMore }
      },
      listDmPreviews: async () => listStubDmPreviews(),
      loadOlderMessages: async (groupId, beforeLamportTs) => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const all = applyReadStatus(readChatMessages(groupId), localUserId).filter(
          (m) => m.lamportTs < beforeLamportTs
        )
        const hasMore = all.length > CHAT_HISTORY_PAGE_SIZE
        const messages = hasMore ? all.slice(-CHAT_HISTORY_PAGE_SIZE) : all
        return { messages, hasMore }
      },
      sendText: async (groupId, text, options?: SendChatOptions) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const trimmed = text.trim()
        if (!trimmed) throw stubError('stub.messageEmpty')
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
          mentions: mentions.length ? mentions : undefined,
          replyToMsgId: options?.replyToMsgId
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      sendTaskRef: async (groupId, taskId) => {
        const all = readAllTasks()
        const list = all[groupId] ?? []
        const task = list.find((t) => t.taskId === taskId && !t.deletedAt)
        if (!task) throw stubError('stub.taskNotFound')
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const msg = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'task_ref' as const,
          content: { kind: 'task_ref' as const, taskId: task.taskId, title: task.title },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent' as const
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      sendCode: async (groupId, code, languageHint, theme, options?: SendChatOptions) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const trimmed = code.trim()
        if (!trimmed) throw stubError('stub.codeEmpty')
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
          deliveryStatus: 'sent',
          replyToMsgId: options?.replyToMsgId
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      listMembers: async (groupId) => listStubMembers(groupId),
      pickAndSendFile: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      sendFile: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      sendExistingFile: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      captureAndSendScreenshot: async () => {
        throw stubError('stub.screenshotElectronOnly')
      },
      sendVoice: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      recallMessage: async (groupId, msgId) => {
        const status = readStatus()
        if (!status.configured || !status.user) {
          throw stubError('stub.identityRequired')
        }
        const prev = readChatMessages(groupId)
        const existing = prev.find((m) => m.msgId === msgId)
        if (!existing) throw stubError('stub.messageNotFound')
        if (!canRecallMessage(existing, status.user.userId)) {
          throw stubError('stub.recallNotAllowed')
        }
        const updated = toRecalledMessage(existing, status.user.userId, new Date().toISOString())
        writeChatMessages(
          groupId,
          prev.map((m) => (m.msgId === msgId ? updated : m))
        )
        for (const fn of chatListeners) fn(updated)
        return updated
      },
      retryMessage: async (msgId) => {
        const status = readStatus()
        if (!status.configured || !status.user) {
          throw stubError('stub.identityRequired')
        }
        for (const groupId of Object.keys(
          JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) ?? '{}') as Record<string, unknown>
        )) {
          const prev = readChatMessages(groupId)
          const existing = prev.find((m) => m.msgId === msgId)
          if (!existing) continue
          if (existing.senderUserId !== status.user.userId) {
            throw stubError('err.chatRetryNotOwner')
          }
          if (existing.deliveryStatus !== 'failed' && existing.deliveryStatus !== 'sending') {
            throw stubError('err.chatRetryInvalidStatus')
          }
          const sent = { ...existing, deliveryStatus: 'sent' as const }
          writeChatMessages(
            groupId,
            prev.map((m) => (m.msgId === msgId ? sent : m))
          )
          for (const fn of chatListeners) fn(sent)
          return sent
        }
        throw stubError('stub.messageNotFound')
      },
      editMessage: async (groupId, msgId, text) => {
        const status = readStatus()
        if (!status.configured || !status.user) throw stubError('stub.identityRequired')
        const trimmed = text.trim()
        if (!trimmed) throw stubError('stub.messageEmpty')
        const prev = readChatMessages(groupId)
        const existing = prev.find((m) => m.msgId === msgId)
        if (!existing) throw stubError('stub.messageNotFound')
        if (!canEditMessage(existing, status.user.userId)) throw stubError('err.chatEditNotAllowed')
        const editedAt = new Date().toISOString()
        const updated: ChatMessage = {
          ...existing,
          content: {
            kind: 'text',
            text: trimmed,
            meta: { ...existing.content.kind === 'text' ? existing.content.meta : undefined, editedAt }
          }
        }
        writeChatMessages(
          groupId,
          prev.map((m) => (m.msgId === msgId ? updated : m))
        )
        for (const fn of chatListeners) fn(updated)
        return updated
      },
      listPinnedIds: async (groupId) => readPinPayload(groupId)?.msgIds ?? [],
      togglePin: async (groupId, msgId) => {
        const status = readStatus()
        if (!status.configured || !status.user) throw stubError('stub.identityRequired')
        const local = readPinPayload(groupId)
        const msgIds = togglePinId(local?.msgIds ?? [], msgId)
        const payload: ChatPinPayload = {
          groupId,
          msgIds,
          updatedAt: new Date().toISOString(),
          updatedBy: status.user.userId
        }
        writePinPayload(mergePinPayload(local, payload))
        return msgIds
      },
      forwardMessage: async (sourceMsgId, targetGroupId, senderDisplayName) => {
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const found = findMessageById(sourceMsgId)
        if (!found) throw stubError('stub.messageNotFound')
        const { message: source } = found
        if (!canForwardMessage(source)) throw stubError('err.chatForwardNotAllowed')
        const from = forwardedFromForMessage(source, senderDisplayName)
        const prev = readChatMessages(targetGroupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        let content = source.content
        if (source.content.kind === 'text') {
          content = buildForwardedTextContent(source, from)
        } else {
          const cloned = cloneContentForForward(source.content)
          if (cloned.kind === 'text') {
            content = { ...cloned, meta: { ...cloned.meta, forwardedFrom: from } }
          } else {
            content = cloned
          }
        }
        const msg: ChatMessage = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId: targetGroupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: source.type,
          content,
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent'
        }
        writeChatMessages(targetGroupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return msg
      },
      markRead: async (groupId, msgIds) => {
        const status = readStatus()
        if (!status.configured || !status.user) return
        const localUserId = status.user.userId
        const receipts = readReceiptMap()
        for (const msgId of msgIds) {
          const prev = readChatMessages(groupId)
          const msg = prev.find((m) => m.msgId === msgId)
          if (!msg || msg.senderUserId === localUserId) continue
          const readers = new Set(receipts[msgId] ?? [])
          readers.add(localUserId)
          receipts[msgId] = [...readers]
        }
        writeReceiptMap(receipts)
      },
      onMessage: (handler) => {
        chatListeners.add(handler)
        return () => chatListeners.delete(handler)
      }
    },
    task: {
      listTasks: async (groupId) => {
        const tasks = readAllTasks()[groupId] ?? []
        return applyAggregatedProgress(tasks)
      },
      createTask: async (input) => stubCreateTask(input),
      updateTask: async (input) => stubUpdateTask(input),
      moveTask: async (input) => {
        const all = readAllTasks()
        for (const list of Object.values(all)) {
          const existing = list.find((t) => t.taskId === input.taskId)
          if (!existing) continue
          const sortOrder =
            input.sortOrder ??
            (input.status !== existing.status
              ? maxSortInColumn(list, input.status) + 1
              : existing.sortOrder)
          return stubUpdateTask({
            taskId: input.taskId,
            status: input.status,
            sortOrder,
            otherReason: input.status === 'other' ? (input.otherReason ?? null) : null
          })
        }
        throw stubError('stub.taskNotFound')
      },
      createFromChat: async (groupId, title, options) => {
        const task = stubCreateTask({
          groupId,
          title,
          status: 'todo',
          sourceMsgId: options?.sourceMsgId,
          linkedFileIds: options?.linkedFileIds
        })
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const msg = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'task_ref' as const,
          content: { kind: 'task_ref' as const, taskId: task.taskId, title: task.title },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent' as const
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return { task, message: msg }
      },
      referenceFromChat: async (groupId, taskId) => {
        const all = readAllTasks()
        const list = all[groupId] ?? []
        const task = list.find((t) => t.taskId === taskId && !t.deletedAt)
        if (!task) throw stubError('stub.taskNotFound')
        const status = readStatus()
        if (!status.configured || !status.user || !status.device) {
          throw stubError('stub.identityRequired')
        }
        const prev = readChatMessages(groupId)
        const lamportTs = (prev.at(-1)?.lamportTs ?? 0) + 1
        const msg = {
          msgId: `msg_${crypto.randomUUID()}`,
          groupId,
          senderUserId: status.user.userId,
          senderDeviceId: status.device.deviceId,
          type: 'task_ref' as const,
          content: { kind: 'task_ref' as const, taskId: task.taskId, title: task.title },
          lamportTs,
          createdAt: new Date().toISOString(),
          deliveryStatus: 'sent' as const
        }
        writeChatMessages(groupId, [...prev, msg])
        for (const fn of chatListeners) fn(msg)
        return { task, message: msg }
      },
      listDiscussions: async (groupId, taskId) => {
        assertStubTaskWritable(groupId)
        const all = readAllTasks()
        const list = all[groupId] ?? []
        const task = list.find((t) => t.taskId === taskId && !t.deletedAt)
        if (!task) throw stubError('stub.taskNotFound')
        return collectTaskDiscussions(readChatMessages(groupId), taskId, task.sourceMsgId)
      },
      listChecklist: async (groupId, taskId) => stubListChecklist(groupId, taskId),
      upsertChecklistItem: async (input) => stubUpsertChecklistItem(input),
      toggleChecklistItem: async (groupId, itemId, done) => {
        assertStubTaskWritable(groupId)
        const all = readAllChecklists()
        for (const [taskId, items] of Object.entries(all)) {
          const idx = items.findIndex((i) => i.itemId === itemId)
          if (idx < 0) continue
          const task = (readAllTasks()[groupId] ?? []).find(
            (t) => t.taskId === taskId && !t.deletedAt
          )
          if (!task) throw stubError('stub.taskNotFound')
          const prev = items[idx]!
          const next: ChecklistItem = {
            ...prev,
            done: done !== undefined ? done : !prev.done,
            updatedAt: new Date().toISOString()
          }
          const copy = [...items]
          copy[idx] = next
          writeTaskChecklist(taskId, copy)
          for (const fn of taskListeners) fn(groupId)
          return next
        }
        throw stubError('stub.taskNotFound')
      },
      removeChecklistItem: async (groupId, itemId) => {
        assertStubTaskWritable(groupId)
        const all = readAllChecklists()
        for (const [taskId, items] of Object.entries(all)) {
          if (!items.some((i) => i.itemId === itemId)) continue
          const task = (readAllTasks()[groupId] ?? []).find(
            (t) => t.taskId === taskId && !t.deletedAt
          )
          if (!task) throw stubError('stub.taskNotFound')
          writeTaskChecklist(
            taskId,
            items.filter((i) => i.itemId !== itemId)
          )
          for (const fn of taskListeners) fn(groupId)
          return true
        }
        return false
      },
      createSubtaskFromChecklistItem: async (groupId, itemId) => {
        assertStubTaskWritable(groupId)
        const all = readAllChecklists()
        for (const [taskId, items] of Object.entries(all)) {
          const idx = items.findIndex((i) => i.itemId === itemId)
          if (idx < 0) continue
          const parent = (readAllTasks()[groupId] ?? []).find(
            (t) => t.taskId === taskId && !t.deletedAt
          )
          if (!parent) throw stubError('stub.taskNotFound')
          const prev = items[idx]!
          if (prev.done) throw stubError('stub.taskNotFound')
          if (prev.linkedSubtaskId) {
            const linked = (readAllTasks()[groupId] ?? []).find(
              (t) => t.taskId === prev.linkedSubtaskId && !t.deletedAt
            )
            if (linked) return { task: linked, item: prev }
          }
          const child = stubCreateTask({
            groupId,
            title: prev.text,
            parentTaskId: parent.taskId,
            status: 'todo',
            priority: parent.priority
          })
          const next: ChecklistItem = {
            ...prev,
            linkedSubtaskId: child.taskId,
            updatedAt: new Date().toISOString()
          }
          const copy = [...items]
          copy[idx] = next
          writeTaskChecklist(taskId, copy)
          return { task: child, item: next }
        }
        throw stubError('stub.taskNotFound')
      },
      updateSchedule: async (input) =>
        stubUpdateTask({
          taskId: input.taskId,
          startDate: input.startDate,
          endDate: input.endDate
        }),
      upsertDependency: async (input) => {
        void input
        throw stubError('stub.ganttDepsUnsupported')
      },
      removeDependency: async () => false,
      deleteTask: async (taskId) => {
        const all = readAllTasks()
        for (const [groupId, list] of Object.entries(all)) {
          if (!list.some((t) => t.taskId === taskId)) continue
          writeGroupTasks(
            groupId,
            list.filter((t) => t.taskId !== taskId)
          )
          return true
        }
        return false
      },
      onTasksChanged: (handler) => {
        taskListeners.add(handler)
        return () => taskListeners.delete(handler)
      },
      setAwareness: async () => [],
      listAwareness: async () => [],
      listGroupTags: async (groupId) => stubGroupTags[groupId] ?? [],
      upsertGroupTag: async (groupId, tagKey, color, label) => {
        if (!isGroupTagColor(color)) throw new Error('invalid color')
        const key = normalizeGroupTagKey(tagKey)
        const row: GroupTagMeta = {
          groupId,
          tagKey: key,
          color: color.trim(),
          label,
          updatedAt: new Date().toISOString()
        }
        const prev = stubGroupTags[groupId] ?? []
        stubGroupTags[groupId] = [...prev.filter((r) => r.tagKey !== key), row]
        for (const fn of groupTagListeners) fn(groupId)
        return row
      },
      removeGroupTag: async (groupId, tagKey) => {
        const key = normalizeGroupTagKey(tagKey)
        const prev = stubGroupTags[groupId] ?? []
        const next = prev.filter((r) => r.tagKey !== key)
        if (next.length === prev.length) return false
        stubGroupTags[groupId] = next
        for (const fn of groupTagListeners) fn(groupId)
        return true
      },
      importLocalTagColors: async (groupId, overrides) => {
        if ((stubGroupTags[groupId] ?? []).length > 0) return 0
        let n = 0
        const now = new Date().toISOString()
        const rows: GroupTagMeta[] = []
        for (const [raw, color] of Object.entries(overrides)) {
          if (!isGroupTagColor(color)) continue
          const tagKey = normalizeGroupTagKey(raw)
          if (!tagKey) continue
          rows.push({
            groupId,
            tagKey,
            color: color.trim(),
            updatedAt: now
          })
          n++
        }
        stubGroupTags[groupId] = rows
        if (n > 0) for (const fn of groupTagListeners) fn(groupId)
        return n
      },
      onAwarenessChanged: () => () => undefined,
      onGroupTagsChanged: (handler) => {
        groupTagListeners.add(handler)
        return () => groupTagListeners.delete(handler)
      }
    },
    file: {
      listFiles: async (groupId, category) => {
        const files = readAllFiles()[groupId] ?? []
        if (!category) return files
        return files.filter((f) => f.category === category)
      },
      upload: async () => {
        throw stubError('stub.uploadElectronOnly')
      },
      getPreviewUrl: async () => null,
      getPreviewText: async () => null,
      listTransfers: async () => [],
      listTransferHistory: async () => [],
      resumeTransfer: async (transferId) => {
        void transferId
        throw stubError('stub.uploadElectronOnly')
      },
      cancelTransfer: async (transferId) => {
        void transferId
        throw stubError('stub.uploadElectronOnly')
      },
      getTransferSettings: async () => ({ rateKbps: 0 }),
      setTransferRate: async (rateKbps) => ({ rateKbps }),
      addBookmark: async (groupId, url, title) => {
        const now = new Date().toISOString()
        const meta: FileMeta = {
          fileId: `stub_bm_${Date.now()}`,
          groupId,
          name: title || url,
          ext: 'url',
          category: 'bookmark',
          size: 0,
          uploadedBy: 'stub',
          uploadedAt: now,
          sha256: '',
          storagePath: '',
          previewStatus: 'ready',
          isBookmark: true,
          bookmarkUrl: url,
          bookmarkTitle: title || url,
          updatedAt: now
        }
        const files = readAllFiles()[groupId] ?? []
        writeGroupFiles(groupId, [...files, meta])
        return meta
      },
      importBookmarks: async () => [],
      exportBookmarks: async () => {
        throw stubError('stub.exportBookmarksElectronOnly')
      },
      pullRemote: async (fileId) => {
        void fileId
        throw stubError('stub.uploadElectronOnly')
      },
      download: async (fileId) => {
        void fileId
        throw stubError('stub.uploadElectronOnly')
      },
      deleteLocal: async (fileId) => {
        const all = readAllFiles()
        for (const [groupId, files] of Object.entries(all)) {
          const next = files.filter((f) => f.fileId !== fileId)
          if (next.length !== files.length) {
            writeGroupFiles(groupId, next)
            return true
          }
        }
        return false
      },
      onTransfersChanged: () => () => undefined
    },
    group: {
      list: async () => {
        const status = readStatus()
        const ownerId = status.user?.userId ?? 'stub'
        return [
          {
            groupId: 'demo-project',
            name: stubT('demo.groupProject'),
            type: 'project' as const,
            createdBy: ownerId,
            createdAt: '2026-01-01T00:00:00.000Z',
            autoDiscover: true
          },
          {
            groupId: 'demo-function',
            name: stubT('demo.groupFunction'),
            type: 'function' as const,
            createdBy: ownerId,
            createdAt: '2026-01-02T00:00:00.000Z',
            autoDiscover: true
          },
          {
            groupId: 'demo-anonymous',
            name: stubT('demo.groupAnonymous'),
            type: 'anonymous' as const,
            createdBy: ownerId,
            createdAt: '2026-01-03T00:00:00.000Z',
            autoDiscover: true
          }
        ].filter((g) => !stubDissolvedGroups.has(g.groupId))
      },
      listLastActivity: async () => {
        const raw = localStorage.getItem(CHAT_STORAGE_KEY)
        if (!raw) return {}
        try {
          const all = JSON.parse(raw) as Record<string, { createdAt?: string }[]>
          const out: Record<string, string> = {}
          for (const [groupId, msgs] of Object.entries(all)) {
            if (!Array.isArray(msgs) || msgs.length === 0) continue
            let max = ''
            for (const m of msgs) {
              if (typeof m?.createdAt === 'string' && m.createdAt > max) max = m.createdAt
            }
            if (max) out[groupId] = max
          }
          return out
        } catch {
          return {}
        }
      },
      create: async (input) => ({
        groupId: `stub_${Date.now()}`,
        type: input.type,
        name: input.name,
        createdBy: 'stub',
        createdAt: new Date().toISOString(),
        autoDiscover: input.autoDiscover ?? DEFAULT_GROUP_AUTO_DISCOVER
      }),
      join: async (groupId) => ({
        status: 'already_member' as const,
        group: {
          groupId,
          type: 'project' as const,
          name: stubT('stub.preview.groupName'),
          createdBy: 'demo-alice',
          createdAt: new Date().toISOString(),
          autoDiscover: true
        }
      }),
      listJoinRequests: async () => [],
      approveJoinRequest: async () => undefined,
      rejectJoinRequest: async () => undefined,
      startInvite: async (groupId) => ({
        inviteId: 'stub-invite',
        groupId,
        groupName: stubT('stub.preview.groupName'),
        code: '123456',
        codeDisplay: '123 456',
        expiresAt: new Date(Date.now() + 300_000).toISOString()
      }),
      cancelInvite: async () => ({ ok: true as const }),
      joinWithInvite: async ({ code }) => ({
        status: 'joined' as const,
        group: {
          groupId: `grp_invite_${code}`,
          type: 'project' as const,
          name: stubT('stub.preview.inviteJoinGroupName'),
          createdBy: 'demo-alice',
          createdAt: new Date().toISOString(),
          autoDiscover: true
        }
      }),
      enterAnonymous: async () => undefined,
      leaveAnonymous: async () => undefined,
      dissolve: async (groupId) => {
        stubDissolvedGroups.add(groupId)
        persistStubDissolvedGroups()
      },
      onListChanged: () => () => undefined,
      onJoinRequestsChanged: () => () => undefined
    },
    cockpit: {
      getDashboard: async () => ({
        summary: {
          totalProjects: 1,
          inProgressCount: 2,
          delayedCount: 0,
          riskProjectCount: 0
        },
        projects: [
          {
            groupId: 'demo-project',
            name: stubT('demo.groupProject'),
            progressPercent: 50,
            status: 'normal' as const,
            inProgressCount: 2,
            delayedCount: 0,
            totalTasks: 4
          }
        ],
        departments: [{ department: stubT('stub.preview.departmentRnd'), completionPercent: 75, taskCount: 4, doneCount: 3 }],
        executiveSummary: {
          completedThisWeek: 1,
          inProgressCount: 2,
          riskProjectCount: 0,
          dueNextWeek: 0
        },
        weeklyTrend: {
          completedThisWeek: 1,
          completedLastWeek: 0,
          weekOverWeekDelta: 1,
          milestonesCompletedThisWeek: 0,
          milestonesCompletedLastWeek: 0
        },
        attentionTasks: [
          {
            taskId: 'task-attention-1',
            groupId: 'demo-project',
            projectName: stubT('demo.groupProject'),
            title: stubT('stub.preview.sampleOverdueTask'),
            assigneeName: stubT('stub.preview.sampleAssignee'),
            kind: 'overdue' as const,
            endDate: '2026-07-01'
          }
        ]
      }),
      generateWeeklyReport: async () => {
        if (!isStubPluginLicensed('lanpm.weekly')) {
          throw new Error('plugin.weeklyLicenseRequired')
        }
        return {
          format: 'markdown' as const,
          content: '# Stub 周报',
          generatedAt: new Date().toISOString(),
          usedExternalAi: false
        }
      },
      generateMonthlyReport: async () => {
        if (!isStubPluginLicensed('lanpm.weekly')) {
          throw new Error('plugin.weeklyLicenseRequired')
        }
        return {
          format: 'markdown' as const,
          content: '# Stub 月报',
          generatedAt: new Date().toISOString(),
          usedExternalAi: false
        }
      },
      evaluateProjects: async () => ({
        format: 'markdown' as const,
        content: '# Stub 评估',
        generatedAt: new Date().toISOString(),
        usedExternalAi: false
      }),
      getAiConfig: async () => null,
      saveAiConfig: async (input) => {
        const key = input.apiKey?.trim() ?? ''
        if (!key) throw stubError('err.apiKeyRequired')
        return {
          provider: input.provider,
          baseUrl: input.baseUrl,
          model: input.model,
          enabled: input.enabled,
          dataPolicy: 'desensitized-only' as const,
          hasApiKey: true,
          patrolEnabled: input.patrolEnabled ?? true,
          patrolIntervalHours: input.patrolIntervalHours ?? 24
        }
      }
    },
    ai: {
      listThreads: async () => [],
      getThread: async (threadId) => ({
        thread: {
          threadId,
          userId: 'stub-user',
          groupId: 'demo-project',
          title: 'Stub',
          context: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        messages: []
      }),
      createThread: async (input) => ({
        threadId: 'aith_stub',
        userId: 'stub-user',
        groupId: input?.groupId ?? null,
        title: input?.title ?? 'Stub',
        context: input?.context ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }),
      deleteThread: async () => ({ ok: true }),
      getGateStatus: async () => ({
        enabled: false,
        hasApiKey: false,
        endpointReachable: null,
        endpointCheckedAt: null,
        canStream: false
      }),
      probeEndpoint: async (input) => ({
        reachable: Boolean(input?.baseUrl?.includes('ok')),
        checkedAt: new Date().toISOString()
      }),
      streamChat: async () => ({ requestId: 'stub-req' }),
      reviewTask: async () => ({
        summary: 'Stub review',
        risks: [],
        suggestions: ['Stub suggestion'],
        usedExternalAi: false
      }),
      proposeSubtasks: async () => ({
        proposals: [
          { title: 'Stub subtask A' },
          { title: 'Stub subtask B', suggestedEndDate: '2026-08-15' }
        ],
        usedExternalAi: false
      }),
      confirmSubtasks: async (input) => ({
        createdTaskIds: input.items.map((_, i) => `task_stub_${i}`)
      }),
      listPatrolRuns: async () => [],
      getLatestPatrolRun: async () => null,
      startPipeline: async (input) => {
        if (input.presetId === 'taskRemediate') {
          return {
            runId: 'pipe_stub_remediate',
            userId: 'stub-user',
            groupId: input.groupId,
            presetId: 'taskRemediate' as const,
            status: 'awaiting_confirm' as const,
            startedAt: new Date().toISOString(),
            finishedAt: null,
            steps: [],
            finalMarkdown: null,
            usedExternalAi: false,
            degraded: false,
            pendingConfirm: {
              parentTaskId: input.parentTaskId ?? 'task_stub_parent',
              parentTaskTitle: 'Stub parent task',
              proposals: [
                { title: 'Stub subtask A' },
                { title: 'Stub subtask B', suggestedEndDate: '2026-08-15' }
              ],
              usedExternalAi: false
            },
            createdTaskIds: []
          }
        }
        return {
          runId: 'pipe_stub',
          userId: 'stub-user',
          groupId: input.groupId,
          presetId: input.presetId,
          status: 'completed' as const,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          steps: [],
          finalMarkdown: '# Stub health check\n\nPipeline stub report.',
          usedExternalAi: false,
          degraded: false,
          pendingConfirm: null,
          createdTaskIds: []
        }
      },
      resumePipeline: async (input) => ({
        runId: input.runId,
        userId: 'stub-user',
        groupId: 'demo-project',
        presetId: 'taskRemediate' as const,
        status: 'completed' as const,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        steps: [],
        finalMarkdown: '# Stub remediate report\n\nSubtasks created.',
        usedExternalAi: false,
        degraded: false,
        pendingConfirm: null,
        createdTaskIds: input.items.map((_, i) => `task_stub_${i}`)
      }),
      cancelPipeline: async (input) => ({
        runId: input.runId,
        userId: 'stub-user',
        groupId: 'demo-project',
        presetId: 'taskRemediate' as const,
        status: 'failed' as const,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        steps: [],
        finalMarkdown: null,
        usedExternalAi: false,
        degraded: false,
        pendingConfirm: null,
        createdTaskIds: []
      }),
      getPipelineRun: async () => null,
      listPipelineRuns: async () => [],
      shareToChat: async (input) => ({
        msgId: `msg_ai_${Date.now()}`,
        groupId: input.groupId,
        senderUserId: 'stub-user',
        senderDeviceId: 'stub-device',
        type: 'text' as const,
        content: {
          kind: 'text' as const,
          text: input.markdown,
          meta: { source: 'ai-assistant' as const, aiThreadId: input.threadId }
        },
        lamportTs: Date.now(),
        createdAt: new Date().toISOString(),
        deliveryStatus: 'sent' as const
      }),
      onStreamChunk: () => () => undefined,
      onStreamDone: () => () => undefined,
      onStreamError: () => () => undefined
    },
    search: {
      query: async (query) => {
        const q = query.trim()
        const lower = q.toLowerCase()
        if (!lower) return { query: q, hits: [] }
        const groupNames: Record<string, string> = {
          'demo-project': stubT('demo.groupProject'),
          'demo-function': stubT('demo.groupFunction'),
          'demo-anonymous': stubT('demo.groupAnonymous')
        }
        const hits: import('@shared/search/types').GlobalSearchHit[] = []
        for (const [groupId, tasks] of Object.entries(readAllTasks())) {
          for (const t of tasks) {
            if (t.title.toLowerCase().includes(lower)) {
              hits.push({
                kind: 'task',
                groupId,
                taskId: t.taskId,
                title: t.title,
                groupName: groupNames[groupId] ?? groupId
              })
            }
          }
        }
        try {
          const raw = localStorage.getItem(CHAT_STORAGE_KEY)
          const store = raw ? (JSON.parse(raw) as Record<string, import('@shared/chat/types').ChatMessage[]>) : {}
          for (const [groupId, msgs] of Object.entries(store)) {
            for (const m of msgs) {
              const text =
                m.content.kind === 'text'
                  ? m.content.text
                  : m.content.kind === 'code'
                    ? m.content.code
                    : m.content.kind === 'task_ref'
                      ? m.content.title
                      : ''
              if (!text.toLowerCase().includes(lower)) continue
              hits.push({
                kind: 'message',
                groupId,
                msgId: m.msgId,
                snippet: text.slice(0, 60),
                groupName: groupNames[groupId] ?? groupId
              })
            }
          }
        } catch {
          /* ignore */
        }
        const groupIds = ['demo-project', 'demo-function', 'demo-anonymous']
        const seenMembers = new Set<string>()
        for (const groupId of groupIds) {
          for (const member of listStubMembers(groupId)) {
            const key = `${groupId}:${member.userId}`
            if (seenMembers.has(key)) continue
            const nameMatch = member.displayName.toLowerCase().includes(lower)
            const mentionMatch = member.mentionKeys?.some((k) => k.toLowerCase().includes(lower))
            if (!nameMatch && !mentionMatch) continue
            seenMembers.add(key)
            hits.push({
              kind: 'member',
              groupId,
              userId: member.userId,
              displayName: member.displayName,
              groupName: groupNames[groupId] ?? groupId
            })
          }
        }
        return { query: q, hits: hits.slice(0, 16) }
      }
    },
    network: {
      getStatus: async () => ({
        mode: 'stub' as const,
        linkState: 'stub' as const,
        peerCount: 0,
        localIp: null
      }),
      reconnect: async () => ({
        mode: 'stub' as const,
        linkState: 'stub' as const,
        peerCount: 0,
        localIp: null
      }),
      connectManualPeer: async (address) => {
        parseHostPort(address)
        throw stubError('stub.manualPeerPreviewOnly')
      }
    },
    badge: {
      getGroupTabBadges: async (groupId) => stubGroupTabBadges(groupId)
    },
    discover: {
      snapshot: async () => {
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const peers = listStubMembers('demo-project')
          .filter((m) => m.userId !== localUserId)
          .map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            deviceCount: 1,
            online: true
          }))
        return {
          peers,
          groups: [
            {
              groupId: 'stub-remote-project',
              name: stubT('stub.preview.groupName'),
              type: 'project' as const,
              ownerUserId: 'demo-alice',
              ownerDisplayName: 'Alice',
              joined: false
            }
          ],
          health: {
            reason: 'ok' as const,
            ok: true,
            suggestManualPeer: false,
            multicastOk: null
          },
          seeds: stubDiscoverSeeds.slice()
        }
      },
      setSeeds: async (seeds: string[]) => {
        stubDiscoverSeeds = Array.isArray(seeds) ? seeds.map(String) : []
        const status = readStatus()
        const localUserId = status.configured && status.user ? status.user.userId : undefined
        const peers = listStubMembers('demo-project')
          .filter((m) => m.userId !== localUserId)
          .map((m) => ({
            userId: m.userId,
            displayName: m.displayName,
            deviceCount: 1,
            online: true
          }))
        return {
          peers,
          groups: [
            {
              groupId: 'stub-remote-project',
              name: stubT('stub.preview.groupName'),
              type: 'project' as const,
              ownerUserId: 'demo-alice',
              ownerDisplayName: 'Alice',
              joined: false
            }
          ],
          health: {
            reason: 'ok' as const,
            ok: true,
            suggestManualPeer: false,
            multicastOk: null
          },
          seeds: stubDiscoverSeeds.slice()
        }
      }
    },
    ops: {
      sendSlash: async () => ({ requestId: 'stub-ops' }),
      listMachines: async () => [],
      listAudit: async () => [],
      getGroupSettings: async (groupId) => ({
        groupId,
        assistantEnabled: false,
        watchEnabled: false
      }),
      updateGroupSettings: async (groupId, patch) => ({
        groupId,
        assistantEnabled: patch.assistantEnabled ?? false,
        watchEnabled: patch.watchEnabled ?? false
      }),
      getGatewayStatus: async () => ({
        running: false,
        host: '127.0.0.1',
        port: 8787,
        url: null,
        token: 'stub-token',
        root: './data',
        terminalEnabled: false
      }),
      startGateway: async () => ({
        running: false,
        host: '127.0.0.1',
        port: 8787,
        url: null,
        token: 'stub-token',
        root: './data',
        terminalEnabled: false
      }),
      stopGateway: async () => ({
        running: false,
        host: '127.0.0.1',
        port: 8787,
        url: null,
        token: 'stub-token',
        root: './data',
        terminalEnabled: false
      }),
      updateGatewayConfig: async () => ({
        running: false,
        host: '127.0.0.1',
        port: 8787,
        url: null,
        token: 'stub-token',
        root: './data',
        terminalEnabled: false
      }),
      rotateGatewayToken: async () => ({
        running: false,
        host: '127.0.0.1',
        port: 8787,
        url: null,
        token: 'stub-rotated',
        root: './data',
        terminalEnabled: false
      })
    },
    pairing: {
      start: async () => ({
        pairingId: 'stub-pairing',
        code: '847293',
        codeDisplay: '847 293',
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        groups: [
          { groupId: 'stub-remote-project', name: stubT('stub.preview.groupName'), type: 'project' as const }
        ],
        localIp: '127.0.0.1',
        localIpTail: '1'
      }),
      cancel: async () => ({ ok: true as const }),
      join: async () => ({
        join: {
          deviceId: 'stub-peer',
          userId: 'demo-alice',
          displayName: 'Alice',
          host: '127.0.0.1',
          listenPort: 43_124,
          groupIds: ['stub-remote-project']
        },
        snapshot: {
          peers: [
            {
              userId: 'demo-alice',
              displayName: 'Alice',
              deviceCount: 1,
              online: true
            }
          ],
          groups: [
            {
              groupId: 'stub-remote-project',
              name: stubT('stub.preview.groupName'),
              type: 'project' as const,
              ownerUserId: 'demo-alice',
              ownerDisplayName: 'Alice',
              joined: false
            }
          ],
          health: {
            reason: 'ok' as const,
            ok: true,
            suggestManualPeer: false,
            multicastOk: null
          },
          seeds: stubDiscoverSeeds.slice()
        }
      }),
      exportPeerFileDialog: async () => ({
        path: '/tmp/lanpm-peer.json',
        file: {
          v: 1 as const,
          host: '127.0.0.1',
          port: 43_124,
          deviceId: 'stub-device',
          displayName: 'Stub',
          fingerprint: '0'.repeat(64)
        }
      }),
      importPeerFileDialog: async () => ({
        path: '/tmp/lanpm-peer.json',
        file: {
          v: 1 as const,
          host: '127.0.0.1',
          port: 43_124,
          deviceId: 'stub-peer',
          displayName: 'Alice',
          fingerprint: '0'.repeat(64)
        },
        snapshot: {
          peers: [],
          groups: [],
          health: { reason: 'ok' as const, ok: true, suggestManualPeer: false, multicastOk: null },
          seeds: []
        }
      })
    },
    mindmap: {
      list: async (groupId) => {
        return readStubMindmaps()
          .filter((d) => d.groupId === groupId)
          .map(({ docId, groupId: gid, title, updatedAt }) => ({
            docId,
            groupId: gid,
            title,
            updatedAt
          }))
      },
      create: async (input: CreateMindmapInput) => {
        const now = new Date().toISOString()
        const docId = `stub-mindmap-${Date.now()}`
        const fileId = `stub-mindmap-file-${Date.now()}`
        const title = input.title?.trim() || '未命名脑图'
        const dataJson = emptyMindmapDataJson(title)
        const doc: StubMindmapDoc = {
          docId,
          groupId: input.groupId,
          title,
          fileId,
          createdBy: 'stub-user',
          createdAt: now,
          updatedAt: now,
          dataJson
        }
        const docs = readStubMindmaps()
        docs.push(doc)
        writeStubMindmaps(docs)
        const groupFiles = readAllFiles()[input.groupId] ?? []
        groupFiles.push({
          fileId,
          groupId: input.groupId,
          name: mindmapFileName(title),
          ext: 'json',
          category: 'document',
          size: dataJson.length,
          mimeType: 'application/json',
          uploadedBy: 'stub-user',
          uploadedAt: now,
          sha256: 'stub',
          storagePath: '',
          previewStatus: 'none',
          isBookmark: false,
          updatedAt: now
        })
        writeGroupFiles(input.groupId, groupFiles)
        return toMindmapMeta(doc)
      },
      load: async (docId): Promise<MindmapDocumentLoad | null> => {
        const doc = readStubMindmaps().find((d) => d.docId === docId)
        return doc ?? null
      },
      save: async (input: SaveMindmapInput) => {
        const docs = readStubMindmaps()
        const idx = docs.findIndex((d) => d.docId === input.docId)
        if (idx < 0) throw new Error('Mindmap not found')
        const now = new Date().toISOString()
        docs[idx] = { ...docs[idx], dataJson: input.dataJson, updatedAt: now }
        writeStubMindmaps(docs)
        return toMindmapMeta(docs[idx])
      },
      rename: async (input: RenameMindmapInput) => {
        const docs = readStubMindmaps()
        const idx = docs.findIndex((d) => d.docId === input.docId)
        if (idx < 0) throw new Error('Mindmap not found')
        const title = input.title.trim()
        const now = new Date().toISOString()
        docs[idx] = { ...docs[idx], title, updatedAt: now }
        writeStubMindmaps(docs)
        return toMindmapMeta(docs[idx])
      },
      delete: async (docId) => {
        writeStubMindmaps(readStubMindmaps().filter((d) => d.docId !== docId))
        return { ok: true as const }
      },
      exportPng: async (input: ExportMindmapPngInput) => {
        if (!input.groupId || !input.pngBase64) throw new Error('exportPng input required')
        const fileId = `file_mm_${Date.now()}`
        const now = new Date().toISOString()
        const name = input.fileName ?? `mindmap-${input.docId}.png`
        const meta: FileMeta = {
          fileId,
          groupId: input.groupId,
          name,
          ext: 'png',
          category: 'image',
          size: Math.floor((input.pngBase64.length * 3) / 4),
          mimeType: 'image/png',
          uploadedBy: 'stub-user',
          uploadedAt: now,
          sha256: 'stub',
          storagePath: '',
          previewStatus: 'none',
          isBookmark: false,
          updatedAt: now
        }
        const groupFiles = readAllFiles()[input.groupId] ?? []
        groupFiles.push(meta)
        writeGroupFiles(input.groupId, groupFiles)
        return meta
      },
      getDocState: async (docId: string) => ({
        docId,
        groupId: 'stub',
        anonymous: true,
        updateBase64: ''
      }),
      publishUpdate: async () => undefined,
      publishAwareness: async () => undefined,
      onRemoteUpdate: () => () => undefined,
      onRemoteAwareness: () => () => undefined
    },
    whiteboard: {
      getScene: async (groupId) => readStubWhiteboards()[groupId] ?? null,
      saveScene: async (input: SaveWhiteboardSceneInput) => {
        if (!input.groupId) throw new Error('groupId required')
        const existing = readStubWhiteboards()[input.groupId]
        let linkedTaskId: string | undefined
        if (input.linkedTaskId === null) {
          linkedTaskId = undefined
        } else if (input.linkedTaskId === undefined) {
          linkedTaskId = existing?.linkedTaskId
        } else {
          linkedTaskId = input.linkedTaskId
        }
        const scene = buildWhiteboardScene(
          input.groupId,
          normalizeSceneJson(input.sceneJson || emptyWhiteboardSceneJson()),
          linkedTaskId,
          new Date().toISOString()
        )
        writeStubWhiteboard(scene)
        return scene
      },
      exportPng: async (input) => {
        if (!input.groupId || !input.pngBase64) throw new Error('exportPng input required')
        const fileId = `file_wb_${Date.now()}`
        return {
          fileId,
          groupId: input.groupId,
          name: input.fileName ?? `whiteboard-${input.groupId}.png`,
          ext: 'png',
          category: 'image' as const,
          size: Math.floor((input.pngBase64.length * 3) / 4),
          uploadedBy: 'stub',
          uploadedAt: new Date().toISOString(),
          sha256: 'stub',
          storagePath: '',
          previewStatus: 'none' as const,
          isBookmark: false,
          updatedAt: new Date().toISOString()
        }
      },
      getDocState: async (groupId) => ({ groupId, anonymous: true, updateBase64: '' }),
      publishUpdate: async () => undefined,
      publishAwareness: async () => undefined,
      onRemoteUpdate: () => () => undefined,
      onRemoteAwareness: () => () => undefined
    },
    plugin: {
      listPlugins: async () => STUB_PLUGINS.slice(),
      listSlotPlugins: async (slotId) =>
        STUB_PLUGINS.filter((p) => p.enabled && p.slots.includes(slotId)),
      listContributedViews: async () => {
        const views: import('@shared/plugin/contributions').ContributedPluginView[] = []
        for (const plugin of STUB_PLUGINS) {
          if (!plugin.enabled) continue
          for (const view of plugin.contributions?.views ?? []) {
            views.push({
              ...view,
              pluginId: plugin.id,
              dirName: plugin.dirName,
              enabled: plugin.enabled,
              groupTypes: view.groupTypes?.length ? view.groupTypes : ['project'],
              pricing: view.pricing ?? plugin.pricing
            })
          }
        }
        return views.sort((a, b) => a.route.localeCompare(b.route))
      },
      listCommands: async () => listStubCommands(),
      listMenus: async (location?: import('@shared/plugin/menus').PluginMenuLocation) => {
        const all = listStubMenus()
        if (!location) return all
        return all.filter((item) => item.location === location)
      },
      invokeCommand: async (commandId) => {
        const listed = listStubCommands()
        const pluginOnly = listed.filter((c) => c.source === 'plugin')
        const { resolveCommandAction } = await import('@shared/plugin/commands')
        const action = resolveCommandAction(commandId, pluginOnly)
        if (!action) return { ok: false, commandId, message: 'unknown command' }
        return { ok: true, commandId, action }
      },
      setEnabled: async (pluginId, enabled) => mutateStubPluginEnabled(pluginId, enabled),
      importLicense: async (payload) => {
        let raw: unknown
        try {
          raw = JSON.parse(payload)
        } catch {
          throw new Error('invalid license JSON')
        }
        const grants =
          raw && typeof raw === 'object' && Array.isArray((raw as { grants?: unknown }).grants)
            ? ((raw as { grants: unknown[] }).grants ?? [])
            : [raw]
        const map = readStubPluginLicenses()
        let lastId = ''
        for (const item of grants) {
          if (!item || typeof item !== 'object') continue
          const o = item as { pluginId?: string; features?: unknown[]; expiresAt?: number }
          if (typeof o.pluginId !== 'string' || !o.pluginId.trim()) continue
          const features = Array.isArray(o.features)
            ? o.features.filter((f): f is string => typeof f === 'string')
            : ['license.feature']
          if (features.length === 0) continue
          map[o.pluginId.trim()] = {
            features,
            expiresAt: typeof o.expiresAt === 'number' ? o.expiresAt : undefined
          }
          lastId = o.pluginId.trim()
        }
        if (!lastId) throw new Error('invalid license payload')
        writeStubPluginLicenses(map)
        refreshStubPluginLicenseFields()
        const grant = map[lastId]!
        return {
          pluginId: lastId,
          licensed: isStubPluginLicensed(lastId),
          features: grant.features,
          expiresAt: grant.expiresAt
        }
      },
      getLicenseStatus: async (pluginId) => {
        const grant = readStubPluginLicenses()[pluginId]
        return {
          pluginId,
          licensed: isStubPluginLicensed(pluginId),
          features: grant?.features ?? [],
          expiresAt: grant?.expiresAt
        }
      },
      invokeCapability: async (pluginId, capability, args) => {
        const plugin = STUB_PLUGINS.find((p) => p.id === pluginId)
        if (!plugin?.enabled) throw new Error(`plugin disabled: ${pluginId}`)
        if (!plugin.capabilities.includes(capability)) {
          throw new Error(`capability not granted: ${capability}`)
        }
        if (
          capability !== 'license.feature' &&
          plugin.pricing === 'paid' &&
          !isStubPluginLicensed(pluginId)
        ) {
          throw new Error(`license required for paid plugin: ${pluginId}`)
        }
        if (capability === 'license.feature') {
          const grant = readStubPluginLicenses()[pluginId]
          return {
            pluginId,
            licensed: isStubPluginLicensed(pluginId),
            features: grant?.features ?? [],
            expiresAt: grant?.expiresAt
          }
        }
        if (capability === 'task.get') {
          const taskId = String(args?.taskId ?? '')
          const groupTasks = Object.values(readAllTasks()).flat()
          return groupTasks.find((t) => t.taskId === taskId) ?? null
        }
        if (capability === 'task.list') {
          const groupId = String(args?.groupId ?? '')
          if (!groupId) throw new Error('groupId required')
          return readAllTasks()[groupId] ?? []
        }
        if (capability === 'chat.listMessages') {
          const groupId = String(args?.groupId ?? '')
          if (!groupId) throw new Error('groupId required')
          const status = readStatus()
          const localUserId = status.configured && status.user ? status.user.userId : undefined
          const beforeLamportTs = args?.beforeLamportTs
          if (beforeLamportTs != null && Number.isFinite(Number(beforeLamportTs))) {
            const all = applyReadStatus(readChatMessages(groupId), localUserId).filter(
              (m) => m.lamportTs < Number(beforeLamportTs)
            )
            const hasMore = all.length > CHAT_HISTORY_PAGE_SIZE
            const messages = hasMore ? all.slice(-CHAT_HISTORY_PAGE_SIZE) : all
            return { messages, hasMore }
          }
          const all = applyReadStatus(readChatMessages(groupId), localUserId)
          const hasMore = all.length > CHAT_HISTORY_PAGE_SIZE
          const messages = hasMore ? all.slice(-CHAT_HISTORY_PAGE_SIZE) : all
          return { messages, hasMore }
        }
        if (capability === 'task.getChecklist') {
          const groupId = String(args?.groupId ?? '')
          const taskId = String(args?.taskId ?? '')
          if (!groupId) throw new Error('groupId required')
          if (!taskId) throw new Error('taskId required')
          return stubListChecklist(groupId, taskId)
        }
        if (capability === 'member.list') {
          const groupId = String(args?.groupId ?? '')
          if (!groupId) throw new Error('groupId required')
          return listStubMembers(groupId)
        }
        if (capability === 'ai.getThread') {
          const parsed = parseAiGetThreadInput(args ?? {})
          if (!parsed.ok) throw new Error(parsed.message)
          const threadId = parsed.value.threadId
          return {
            thread: {
              threadId,
              userId: 'stub-user',
              groupId: 'demo-project',
              title: 'Stub',
              context: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            messages: []
          }
        }
        if (isHumanReviewCapability(capability)) {
          const status = readStatus()
          if (!status.configured || !status.user) {
            throw stubError('stub.identityRequired')
          }
          if (capability === 'task.create') {
            const parsed = parseTaskCreateInput(args ?? {})
            if (!parsed.ok) throw new Error(parsed.message)
          } else if (capability === 'task.patch') {
            const groupId = String(args?.groupId ?? '')
            const taskId = String(args?.taskId ?? '')
            const patch = args?.patch
            if (!groupId) throw new Error('groupId required')
            if (!taskId) throw new Error('taskId required')
            if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
              throw new Error('patch required')
            }
            const disallowed = getDisallowedTaskPatchFields(patch as Record<string, unknown>)
            if (disallowed.length > 0) {
              throw new Error(`patch field not allowed: ${disallowed.join(', ')}`)
            }
          } else if (capability === 'board.moveTask') {
            const groupId = String(args?.groupId ?? '')
            const taskId = String(args?.taskId ?? '')
            const moveStatus = args?.status
            if (!groupId) throw new Error('groupId required')
            if (!taskId) throw new Error('taskId required')
            if (!moveStatus) throw new Error('status required')
          } else if (capability === 'chat.sendText') {
            const parsed = parseChatSendTextInput(args ?? {})
            if (!parsed.ok) throw new Error(parsed.message)
          } else if (capability === 'chat.sendMarkdown') {
            const parsed = parseChatSendMarkdownInput(args ?? {})
            if (!parsed.ok) throw new Error(parsed.message)
          } else if (capability === 'ai.streamChat') {
            const parsed = parseAiStreamChatCapabilityInput(args ?? {})
            if (!parsed.ok) throw new Error(parsed.message)
          } else if (capability === 'file.upload') {
            const parsed = parseFileUploadInput(args ?? {})
            if (!parsed.ok) throw new Error(parsed.message)
          }
          const pendingId = `pend_${crypto.randomUUID()}`
          stubCapabilityPendings.set(pendingId, {
            pluginId,
            capability,
            args: args ?? {},
            userId: status.user.userId
          })
          const pending: CapabilityPendingConfirm = {
            status: 'pending_confirm',
            pendingId,
            capability,
            pluginId
          }
          return pending
        }
        throw new Error(`capability not granted: ${capability}`)
      },
      confirmCapability: async (pluginId, pendingId) => {
        if (!pluginId) throw new Error('pluginId required')
        if (!pendingId) throw new Error('pendingId required')
        const pending = stubCapabilityPendings.get(pendingId)
        if (!pending) throw new Error('pending not found')
        stubCapabilityPendings.delete(pendingId)
        if (pending.pluginId !== pluginId) throw new Error('pending plugin mismatch')
        const plugin = STUB_PLUGINS.find((p) => p.id === pluginId)
        if (!plugin?.enabled) throw new Error(`plugin disabled: ${pluginId}`)
        if (!plugin.capabilities.includes(pending.capability)) {
          throw new Error(`capability not granted: ${pending.capability}`)
        }
        const status = readStatus()
        if (!status.configured || !status.user) {
          throw stubError('stub.identityRequired')
        }
        if (pending.userId !== status.user.userId) {
          throw new Error('pending session mismatch')
        }
        return executeStubWriteCapability(pending.capability, pending.args)
      }
    },
    nav: {
      getDocument: async () => readStubNavDocument(),
      getPreferences: async () => readStubNavPreferences(),
      setPreferences: async (prefs) => writeStubNavPreferences(prefs),
      getGroupPreferences: async (groupId) => {
        const trimmed = groupId.trim()
        if (!trimmed) return null
        return readStubNavDocument().byGroup[trimmed] ?? null
      },
      setGroupPreferences: async (groupId, prefs) => {
        const trimmed = groupId.trim()
        if (!trimmed) throw new Error('invalid group id')
        const doc = readStubNavDocument()
        doc.byGroup[trimmed] = normalizeNavPreferences(prefs)
        return writeStubNavDocument(doc).byGroup[trimmed]!
      },
      clearGroupOverride: async (groupId) => {
        const trimmed = groupId.trim()
        if (!trimmed) throw new Error('invalid group id')
        const doc = readStubNavDocument()
        delete doc.byGroup[trimmed]
        return writeStubNavDocument(doc)
      }
    },
    meeting: {
      getLiveKitConfig: async () => toLiveKitConfigPublic(readStubLiveKitConfig()),
      setLiveKitConfig: async (input) => writeStubLiveKitConfig(input),
      saveRecording: async (payload) => {
        const bytes = payload.bytes
        if (!bytes?.length) throw new Error('Recording bytes required')
        const name = payload.suggestedName?.trim() || `meeting-recording-${Date.now()}.webm`
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer
        const blob = new Blob([arrayBuffer], { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = name
        a.click()
        URL.revokeObjectURL(url)
        return { saved: true, path: name }
      },
      listSchedules: async (groupId) => {
        const all = readStubMeetingSchedules()
        if (groupId?.trim()) {
          return filterUpcomingSchedules(all.filter((s) => s.groupId === groupId.trim()))
        }
        return sortSchedulesByStart(all)
      },
      createSchedule: async (input) => {
        const validated = validateCreateMeetingScheduleInput(input)
        if (!validated) throw new Error('Invalid meeting schedule input')
        const record = createMeetingScheduleRecord(validated)
        const all = readStubMeetingSchedules()
        all.push(record)
        writeStubMeetingSchedules(all)
        return record
      },
      updateSchedule: async (input) => {
        const validated = validateUpdateMeetingScheduleInput(input)
        if (!validated) throw new Error('Invalid meeting schedule update')
        const all = readStubMeetingSchedules()
        const idx = all.findIndex((s) => s.id === validated.id)
        const current = idx >= 0 ? all[idx] : undefined
        if (idx < 0 || !current) throw new Error('Schedule not found')
        all[idx] = applyMeetingScheduleUpdate(current, validated)
        writeStubMeetingSchedules(all)
        return all[idx]!
      },
      deleteSchedule: async (payload) => {
        const id = payload.id.trim()
        const all = readStubMeetingSchedules()
        const next = all.filter((s) => s.id !== id)
        if (next.length === all.length) throw new Error('Schedule not found')
        writeStubMeetingSchedules(next)
        return { ok: true as const }
      }
    },
    data: {
      getStorageSettings: async () => ({
        localRetentionDays: 90,
        syncWindowDays: 7,
        messageCount: 0
      }),
      getStorageUsage: async () => ({ messageCount: 0, fileCount: 0 }),
      setLocalRetentionDays: async (days) => days,
      runCleanup: async () => ({
        messagesDeleted: 0,
        receiptsDeleted: 0,
        transfersDeleted: 0,
        tasksDeleted: 0
      }),
      clearGroupMessages: async (groupId) => {
        const before = readChatMessages(groupId).length
        writeChatMessages(groupId, [])
        return before
      },
      listDmGroupIds: async () => {
        try {
          const raw = localStorage.getItem(CHAT_STORAGE_KEY)
          if (!raw) return []
          const store = JSON.parse(raw) as Record<string, ChatMessage[]>
          return Object.keys(store).filter((id) => isDmGroupId(id))
        } catch {
          return []
        }
      },
      exportGroupBundle: async () => null,
      previewGroupBundle: async () => {
        throw stubError('stub.importBundleElectronOnly')
      },
      importGroupBundle: async () => {
        throw stubError('stub.importBundleElectronOnly')
      },
      getAtRestStatus: async () => ({ encrypted: false, minPassphraseLength: 8 }),
      encryptAtRest: async () => {
        throw stubError('stub.encryptAtRestElectronOnly')
      }
    }
  }
}

import { existsSync, statSync } from 'node:fs'
import type { PluginCapabilityId } from '../../shared/plugin/types.ts'
import type {
  BoardMoveTaskArgs,
  ChatListMessagesArgs,
  ChatSendTaskRefArgs,
  ChatSendTextArgs,
  FileUploadArgs,
  MemberListArgs,
  TaskCreateArgs,
  TaskGetChecklistArgs,
  TaskPatchArgs
} from '../../shared/plugin/capabilityTypes.ts'
import {
  isHumanReviewCapability,
  type CapabilityPendingConfirm,
  type HumanReviewCapabilityId
} from '../../shared/plugin/capabilityConfirm.ts'
import { getDisallowedTaskPatchFields } from '../../shared/plugin/taskPatchWhitelist.ts'
import { parseTaskCreateInput } from '../../shared/plugin/taskCreateWhitelist.ts'
import { parseChatSendTextInput } from '../../shared/plugin/chatSendTextWhitelist.ts'
import {
  FILE_UPLOAD_MAX_BYTES,
  parseFileUploadInput
} from '../../shared/plugin/fileUploadWhitelist.ts'
import { pluginDeclaresCapability } from '../../shared/plugin/validateManifest.ts'
import { getDatabase } from '../storage'
import {
  createGroupTask,
  listGroupTasks,
  listTaskChecklist,
  moveGroupTask,
  updateGroupTask
} from '../task/taskService'
import { getTaskById } from '../storage/repositories/taskRepository'
import { getGroupById } from '../group/groupService'
import { listGroupFiles, uploadFileFromPath } from '../file/fileService'
import { findPluginById } from './discover.ts'
import {
  assertPaidPluginLicensed,
  getPluginLicenseStatus
} from './licenseStore.ts'
import {
  listGroupMessages,
  listOlderGroupMessages,
  sendTaskRefMessage,
  sendTextMessage
} from '../chat/chatService'
import { listGroupMembers } from '../chat/memberService'
import {
  getMediaRoomState,
  pollMediaSignals,
  sendMediaSignal
} from '../media/mediaSignalService'
import { listDesktopCaptureSources } from '../media/desktopCaptureService'
import { createLiveKitTokenForGroup } from '../media/livekitTokenService'
import { getSetupStatus } from '../identity/setup'
import { createCapabilityPending, takeCapabilityPending } from './capabilityPendingStore.ts'
import type { Database } from 'better-sqlite3'
import { listOpsMachines } from '../ops/opsSyncService.ts'
import { sendOpsSlashCommand } from '../ops/opsCommandService.ts'
import { parseOpsCommand } from '../../shared/chat/opsCommand.ts'

export type CapabilityArgs = Record<string, unknown>

function requireCurrentUserId(db: Database): string {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user) {
    throw new Error('identity required')
  }
  return status.user.userId
}

function assertPluginReady(pluginId: string, capability: PluginCapabilityId): void {
  const plugin = findPluginById(pluginId)
  if (!plugin) throw new Error(`plugin not found: ${pluginId}`)
  if (!plugin.enabled) throw new Error(`plugin disabled: ${pluginId}`)
  if (!pluginDeclaresCapability(plugin, capability)) {
    throw new Error(`capability not granted: ${capability}`)
  }
  if (capability !== 'license.feature') {
    assertPaidPluginLicensed(pluginId, plugin.pricing)
  }
}

function executeWriteCapability(
  db: Database,
  capability: HumanReviewCapabilityId,
  args: CapabilityArgs
): unknown {
  switch (capability) {
    case 'task.create': {
      const parsed = parseTaskCreateInput(args)
      if (!parsed.ok) throw new Error(parsed.message)
      return createGroupTask(db, parsed.value)
    }
    case 'task.patch': {
      const { groupId, taskId, patch } = args as TaskPatchArgs
      if (!groupId) throw new Error('groupId required')
      if (!taskId) throw new Error('taskId required')
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
        throw new Error('patch required')
      }
      const disallowed = getDisallowedTaskPatchFields(patch as Record<string, unknown>)
      if (disallowed.length > 0) {
        throw new Error(`patch field not allowed: ${disallowed.join(', ')}`)
      }
      const existing = getTaskById(db, taskId)
      if (!existing) throw new Error('task not found')
      if (existing.groupId !== groupId) throw new Error('task not in group')
      return updateGroupTask(db, { taskId, ...patch })
    }
    case 'board.moveTask': {
      const { groupId, taskId, status, sortOrder, otherReason } = args as BoardMoveTaskArgs
      if (!groupId) throw new Error('groupId required')
      if (!taskId) throw new Error('taskId required')
      if (!status) throw new Error('status required')
      const existing = getTaskById(db, taskId)
      if (!existing) throw new Error('task not found')
      if (existing.groupId !== groupId) throw new Error('task not in group')
      return moveGroupTask(db, { taskId, status, sortOrder, otherReason })
    }
    case 'chat.sendText': {
      const parsed = parseChatSendTextInput(args)
      if (!parsed.ok) throw new Error(parsed.message)
      const { groupId, text, replyToMsgId } = parsed.value
      return sendTextMessage(
        db,
        groupId,
        text,
        replyToMsgId ? { replyToMsgId } : undefined
      )
    }
    case 'file.upload': {
      const parsed = parseFileUploadInput(args)
      if (!parsed.ok) throw new Error(parsed.message)
      const { groupId, sourcePath } = parsed.value
      if (!existsSync(sourcePath)) throw new Error('source file not found')
      const stat = statSync(sourcePath)
      if (!stat.isFile()) throw new Error('source path is not a file')
      if (stat.size > FILE_UPLOAD_MAX_BYTES) throw new Error('file too large')
      return uploadFileFromPath(db, groupId, sourcePath)
    }
    default: {
      const _exhaustive: never = capability
      throw new Error(`unknown write capability: ${_exhaustive}`)
    }
  }
}

/**
 * 能力白名单代理：插件不得直连 DB；未声明能力一律拒绝。
 * v0.4：写能力返回 pending_confirm，须 confirmPluginCapability 才落库。
 */
export async function invokePluginCapability(
  pluginId: string,
  capability: PluginCapabilityId,
  args: CapabilityArgs = {}
): Promise<unknown> {
  assertPluginReady(pluginId, capability)

  if (isHumanReviewCapability(capability)) {
    if (capability === 'task.create') {
      const parsed = parseTaskCreateInput(args as TaskCreateArgs)
      if (!parsed.ok) throw new Error(parsed.message)
    } else if (capability === 'task.patch') {
      const { groupId, taskId, patch } = args as TaskPatchArgs
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
      const { groupId, taskId, status } = args as BoardMoveTaskArgs
      if (!groupId) throw new Error('groupId required')
      if (!taskId) throw new Error('taskId required')
      if (!status) throw new Error('status required')
    } else if (capability === 'chat.sendText') {
      const parsed = parseChatSendTextInput(args as ChatSendTextArgs)
      if (!parsed.ok) throw new Error(parsed.message)
    } else if (capability === 'file.upload') {
      const parsed = parseFileUploadInput(args as FileUploadArgs)
      if (!parsed.ok) throw new Error(parsed.message)
      const { sourcePath } = parsed.value
      if (!existsSync(sourcePath)) throw new Error('source file not found')
      const stat = statSync(sourcePath)
      if (!stat.isFile()) throw new Error('source path is not a file')
      if (stat.size > FILE_UPLOAD_MAX_BYTES) throw new Error('file too large')
    }
    const db = getDatabase()
    const userId = requireCurrentUserId(db)
    const pendingId = createCapabilityPending({
      pluginId,
      capability,
      args,
      userId
    })
    const pending: CapabilityPendingConfirm = {
      status: 'pending_confirm',
      pendingId,
      capability,
      pluginId
    }
    return pending
  }

  const db = getDatabase()
  switch (capability) {
    case 'license.feature': {
      return getPluginLicenseStatus(pluginId)
    }
    case 'task.list': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return listGroupTasks(db, groupId)
    }
    case 'task.get': {
      const taskId = String(args.taskId ?? '')
      if (!taskId) throw new Error('taskId required')
      return getTaskById(db, taskId)
    }
    case 'group.get': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return getGroupById(db, groupId)
    }
    case 'file.listMeta': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return listGroupFiles(db, groupId)
    }
    case 'media.signal.send': {
      return sendMediaSignal(db, args)
    }
    case 'media.signal.poll': {
      return pollMediaSignals(db, args)
    }
    case 'media.captureDesktop': {
      return listDesktopCaptureSources()
    }
    case 'media.room.state': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return getMediaRoomState(db, groupId)
    }
    case 'media.livekit.createToken': {
      const groupId = String(args.groupId ?? '')
      const identity = String(args.identity ?? '')
      if (!groupId) throw new Error('groupId required')
      if (!identity) throw new Error('identity required')
      const roomName = args.roomName != null ? String(args.roomName) : undefined
      return createLiveKitTokenForGroup({ groupId, identity, roomName })
    }
    case 'chat.listMessages': {
      const { groupId, beforeLamportTs } = args as ChatListMessagesArgs
      if (!groupId) throw new Error('groupId required')
      if (beforeLamportTs != null && Number.isFinite(beforeLamportTs)) {
        return listOlderGroupMessages(db, groupId, beforeLamportTs)
      }
      return listGroupMessages(db, groupId)
    }
    case 'task.getChecklist': {
      const { groupId, taskId } = args as TaskGetChecklistArgs
      if (!groupId) throw new Error('groupId required')
      if (!taskId) throw new Error('taskId required')
      return listTaskChecklist(db, groupId, taskId)
    }
    case 'member.list': {
      const { groupId } = args as MemberListArgs
      if (!groupId) throw new Error('groupId required')
      return listGroupMembers(db, groupId)
    }
    case 'chat.sendTaskRef': {
      const { groupId, taskId } = args as ChatSendTaskRefArgs
      if (!groupId) throw new Error('groupId required')
      if (!taskId) throw new Error('taskId required')
      return sendTaskRefMessage(db, groupId, taskId)
    }
    case 'ops.machine.list': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return listOpsMachines(groupId)
    }
    case 'ops.command.send': {
      const groupId = String(args.groupId ?? '')
      const text = String(args.text ?? '')
      if (!groupId) throw new Error('groupId required')
      if (!text.trim()) throw new Error('text required')
      const parsed = parseOpsCommand(text)
      if (!parsed) throw new Error('ops_invalid_command')
      return sendOpsSlashCommand(db, groupId, parsed)
    }
    default: {
      const _exhaustive: never = capability
      throw new Error(`unknown capability: ${_exhaustive}`)
    }
  }
}

/** After user confirms pending write — execute once and clear pending. */
export async function confirmPluginCapability(
  pluginId: string,
  pendingId: string
): Promise<unknown> {
  if (typeof pluginId !== 'string' || !pluginId) throw new Error('pluginId required')
  if (typeof pendingId !== 'string' || !pendingId) throw new Error('pendingId required')

  const pending = takeCapabilityPending(pendingId)
  if (!pending) throw new Error('pending not found')
  if (pending.pluginId !== pluginId) throw new Error('pending plugin mismatch')

  assertPluginReady(pluginId, pending.capability)

  const db = getDatabase()
  const userId = requireCurrentUserId(db)
  if (pending.userId !== userId) throw new Error('pending session mismatch')

  return executeWriteCapability(db, pending.capability, pending.args)
}

import type { PluginCapabilityId } from '../../shared/plugin/types.ts'
import type {
  BoardMoveTaskArgs,
  ChatListMessagesArgs,
  ChatSendTaskRefArgs,
  MemberListArgs,
  TaskGetChecklistArgs,
  TaskPatchArgs
} from '../../shared/plugin/capabilityTypes.ts'
import { getDisallowedTaskPatchFields } from '../../shared/plugin/taskPatchWhitelist.ts'
import { pluginDeclaresCapability } from '../../shared/plugin/validateManifest.ts'
import { getDatabase } from '../storage'
import { listGroupTasks, listTaskChecklist, moveGroupTask, updateGroupTask } from '../task/taskService'
import { getTaskById } from '../storage/repositories/taskRepository'
import { getGroupById } from '../group/groupService'
import { listGroupFiles } from '../file/fileService'
import { findPluginById } from './discover.ts'
import {
  assertPaidPluginLicensed,
  getPluginLicenseStatus
} from './licenseStore.ts'
import {
  listGroupMessages,
  listOlderGroupMessages,
  sendTaskRefMessage
} from '../chat/chatService'
import { listGroupMembers } from '../chat/memberService'
import {
  getMediaRoomState,
  pollMediaSignals,
  sendMediaSignal
} from '../media/mediaSignalService'
import { listDesktopCaptureSources } from '../media/desktopCaptureService'
import { createLiveKitTokenForGroup } from '../media/livekitTokenService'

export type CapabilityArgs = Record<string, unknown>

/**
 * 能力白名单代理：插件不得直连 DB；未声明能力一律拒绝。
 */
export async function invokePluginCapability(
  pluginId: string,
  capability: PluginCapabilityId,
  args: CapabilityArgs = {}
): Promise<unknown> {
  const plugin = findPluginById(pluginId)
  if (!plugin) throw new Error(`plugin not found: ${pluginId}`)
  if (!plugin.enabled) throw new Error(`plugin disabled: ${pluginId}`)
  if (!pluginDeclaresCapability(plugin, capability)) {
    throw new Error(`capability not granted: ${capability}`)
  }
  if (capability !== 'license.feature') {
    assertPaidPluginLicensed(pluginId, plugin.pricing)
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
    default: {
      const _exhaustive: never = capability
      throw new Error(`unknown capability: ${_exhaustive}`)
    }
  }
}

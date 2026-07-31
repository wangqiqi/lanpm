import type { PluginCapabilityId } from '../../shared/plugin/types.ts'
import { pluginDeclaresCapability } from '../../shared/plugin/validateManifest.ts'
import { getDatabase } from '../storage'
import { listGroupTasks } from '../task/taskService'
import { getTaskById } from '../storage/repositories/taskRepository'
import { getGroupById } from '../group/groupService'
import { listGroupFiles } from '../file/fileService'
import { findPluginById } from './discover.ts'

export type CapabilityArgs = Record<string, unknown>

/**
 * 能力白名单代理：插件不得直连 DB；未声明能力一律拒绝。
 */
export function invokePluginCapability(
  pluginId: string,
  capability: PluginCapabilityId,
  args: CapabilityArgs = {}
): unknown {
  const plugin = findPluginById(pluginId)
  if (!plugin) throw new Error(`plugin not found: ${pluginId}`)
  if (!plugin.enabled) throw new Error(`plugin disabled: ${pluginId}`)
  if (!pluginDeclaresCapability(plugin, capability)) {
    throw new Error(`capability not granted: ${capability}`)
  }

  const db = getDatabase()
  switch (capability) {
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
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return {
        ok: true,
        stub: true,
        groupId,
        envelopeId: String(args.envelopeId ?? `stub-${Date.now()}`)
      }
    }
    case 'media.signal.poll': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return { stub: true, groupId, messages: [] as unknown[] }
    }
    case 'media.captureDesktop': {
      return { stub: true, sources: [] as { id: string; name: string }[] }
    }
    case 'media.room.state': {
      const groupId = String(args.groupId ?? '')
      if (!groupId) throw new Error('groupId required')
      return {
        stub: true,
        groupId,
        phase: 'idle' as const,
        participants: [] as string[]
      }
    }
    default: {
      const _exhaustive: never = capability
      throw new Error(`unknown capability: ${_exhaustive}`)
    }
  }
}

import { BrowserWindow, ipcMain } from 'electron'
import type { CreateTaskInput, GanttScheduleInput, MoveTaskInput, UpdateTaskInput } from '../../shared/task/types'
import type { UpsertDependencyInput } from '../../shared/task/dependency'
import type { DeleteTaskMode } from '../../shared/task/deleteMode'
import type { TaskAwarenessLocalState } from '../../shared/task/taskAwareness'
import { isTaskAwarenessLocalState } from '../../shared/task/taskAwareness'
import { TASK_AWARENESS_PUSH_CHANNEL, TASK_IPC } from '../../shared/task/channels'
import {
  createGroupTask,
  createTaskFromChat,
  referenceTaskFromChat,
  deleteGroupTask,
  deleteTaskDependency,
  listGroupTasks,
  listTaskDiscussions,
  moveGroupTask,
  updateGroupTask,
  updateTaskSchedule,
  upsertTaskDependency
} from '../task/taskService'
import {
  listRemoteTaskAwareness,
  setLocalTaskAwareness
} from '../task/taskAwarenessService'
import {
  importLocalTagColorsIfEmpty,
  listGroupTags,
  removeGroupTagLocal,
  upsertGroupTagLocal
} from '../task/groupTagSyncService'
import { getDatabase } from '../storage'
import { isGroupTagColor } from '../../shared/task/groupTagMeta'

export function registerTaskIpc(): void {
  ipcMain.handle(TASK_IPC.listTasks, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupTasks(getDatabase(), groupId)
  })

  ipcMain.handle(TASK_IPC.createTask, (_event, input: CreateTaskInput) => {
    return createGroupTask(getDatabase(), input)
  })

  ipcMain.handle(TASK_IPC.updateTask, (_event, input: UpdateTaskInput) => {
    return updateGroupTask(getDatabase(), input)
  })

  ipcMain.handle(TASK_IPC.moveTask, (_event, input: MoveTaskInput) => {
    return moveGroupTask(getDatabase(), input)
  })

  ipcMain.handle(
    TASK_IPC.createFromChat,
    (
      _event,
      groupId: string,
      title: string,
      options?: { sourceMsgId?: string; linkedFileIds?: string[] }
    ) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof title !== 'string') throw new Error('title required')
      if (options !== undefined && (typeof options !== 'object' || options === null)) {
        throw new Error('options must be object')
      }
      if (
        options?.sourceMsgId !== undefined &&
        typeof options.sourceMsgId !== 'string'
      ) {
        throw new Error('sourceMsgId must be string')
      }
      if (
        options?.linkedFileIds !== undefined &&
        !Array.isArray(options.linkedFileIds)
      ) {
        throw new Error('linkedFileIds must be array')
      }
      return createTaskFromChat(getDatabase(), groupId, title, options)
    }
  )

  ipcMain.handle(
    TASK_IPC.referenceFromChat,
    (_event, groupId: string, taskId: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof taskId !== 'string' || !taskId) throw new Error('taskId required')
      return referenceTaskFromChat(getDatabase(), groupId, taskId)
    }
  )

  ipcMain.handle(
    TASK_IPC.listDiscussions,
    (_event, groupId: string, taskId: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof taskId !== 'string' || !taskId) throw new Error('taskId required')
      return listTaskDiscussions(getDatabase(), groupId, taskId)
    }
  )

  ipcMain.handle(TASK_IPC.updateSchedule, (_event, input: GanttScheduleInput) => {
    return updateTaskSchedule(getDatabase(), input)
  })

  ipcMain.handle(TASK_IPC.upsertDependency, (_event, input: UpsertDependencyInput) => {
    return upsertTaskDependency(getDatabase(), input)
  })

  ipcMain.handle(
    TASK_IPC.removeDependency,
    (_event, groupId: string, fromTaskId: string, toTaskId: string) => {
      return deleteTaskDependency(getDatabase(), groupId, fromTaskId, toTaskId)
    }
  )

  ipcMain.handle(
    TASK_IPC.deleteTask,
    (_event, taskId: string, mode?: DeleteTaskMode) => {
      if (typeof taskId !== 'string' || !taskId) throw new Error('taskId required')
      if (mode !== undefined && mode !== 'cascade' && mode !== 'promote') {
        throw new Error('mode must be cascade or promote')
      }
      return deleteGroupTask(getDatabase(), taskId, mode ?? 'promote')
    }
  )

  ipcMain.handle(
    TASK_IPC.setAwareness,
    (_event, groupId: string, state: TaskAwarenessLocalState | null) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (state !== null && !isTaskAwarenessLocalState(state)) {
        throw new Error('invalid awareness state')
      }
      setLocalTaskAwareness(getDatabase(), groupId, state)
      return listRemoteTaskAwareness(groupId)
    }
  )

  ipcMain.handle(TASK_IPC.listAwareness, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listRemoteTaskAwareness(groupId)
  })

  ipcMain.handle(TASK_IPC.listGroupTags, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return listGroupTags(getDatabase(), groupId)
  })

  ipcMain.handle(
    TASK_IPC.upsertGroupTag,
    (_event, groupId: string, tagKey: string, color: string, label?: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof tagKey !== 'string' || !tagKey) throw new Error('tagKey required')
      if (!isGroupTagColor(color)) throw new Error('invalid color')
      return upsertGroupTagLocal(getDatabase(), groupId, tagKey, color, label)
    }
  )

  ipcMain.handle(
    TASK_IPC.removeGroupTag,
    (_event, groupId: string, tagKey: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof tagKey !== 'string' || !tagKey) throw new Error('tagKey required')
      return removeGroupTagLocal(getDatabase(), groupId, tagKey)
    }
  )

  ipcMain.handle(
    TASK_IPC.importLocalTagColors,
    (_event, groupId: string, overrides: Record<string, string>) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (!overrides || typeof overrides !== 'object') throw new Error('overrides required')
      return importLocalTagColorsIfEmpty(getDatabase(), groupId, overrides)
    }
  )
}

/** Push awareness snapshot to all renderer windows. */
export function broadcastTaskAwareness(groupId: string): void {
  const peers = listRemoteTaskAwareness(groupId)
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TASK_AWARENESS_PUSH_CHANNEL, { groupId, peers })
  }
}

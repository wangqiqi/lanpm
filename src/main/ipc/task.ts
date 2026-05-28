import { ipcMain } from 'electron'
import type { CreateTaskInput, GanttScheduleInput, MoveTaskInput, UpdateTaskInput } from '../../shared/task/types'
import type { UpsertDependencyInput } from '../../shared/task/dependency'
import { TASK_IPC } from '../../shared/task/channels'
import {
  createGroupTask,
  createTaskFromChat,
  deleteTaskDependency,
  listGroupTasks,
  moveGroupTask,
  updateGroupTask,
  updateTaskSchedule,
  upsertTaskDependency
} from '../task/taskService'
import { getDatabase } from '../storage'

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
    (_event, groupId: string, title: string) => {
      if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
      if (typeof title !== 'string') throw new Error('title required')
      return createTaskFromChat(getDatabase(), groupId, title)
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
}

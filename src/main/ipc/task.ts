import { ipcMain } from 'electron'
import type { CreateTaskInput, MoveTaskInput, UpdateTaskInput } from '../../shared/task/types'
import { TASK_IPC } from '../../shared/task/channels'
import {
  createGroupTask,
  createTaskFromChat,
  listGroupTasks,
  moveGroupTask,
  updateGroupTask
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
}

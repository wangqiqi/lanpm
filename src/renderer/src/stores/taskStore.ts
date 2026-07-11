import { create } from 'zustand'
import type { DeleteTaskMode } from '@shared/task/deleteMode'
import type { CreateTaskInput, GanttScheduleInput, MoveTaskInput, Task, UpdateTaskInput } from '@shared/task/types'
import type { UpsertDependencyInput } from '@shared/task/dependency'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface TaskState {
  tasksByGroup: Record<string, Task[]>
  loading: Record<string, boolean>
  loadTasks: (groupId: string) => Promise<void>
  createTask: (input: CreateTaskInput) => Promise<Task>
  updateTask: (input: UpdateTaskInput) => Promise<Task>
  updateSchedule: (input: GanttScheduleInput) => Promise<Task>
  upsertDependency: (input: UpsertDependencyInput) => Promise<void>
  moveTask: (input: MoveTaskInput) => Promise<Task>
  deleteTask: (taskId: string, mode?: DeleteTaskMode) => Promise<boolean>
  createFromChat: (
    groupId: string,
    title: string,
    options?: { sourceMsgId?: string; linkedFileIds?: string[] }
  ) => Promise<{ task: Task; message: import('@shared/chat/types').ChatMessage }>
  referenceFromChat: (groupId: string, taskId: string) => Promise<{ task: Task; message: import('@shared/chat/types').ChatMessage }>
  setTasks: (groupId: string, tasks: Task[]) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasksByGroup: {},
  loading: {},

  setTasks: (groupId, tasks) => {
    set((s) => ({
      tasksByGroup: { ...s.tasksByGroup, [groupId]: tasks }
    }))
  },

  loadTasks: async (groupId) => {
    set((s) => ({ loading: { ...s.loading, [groupId]: true } }))
    try {
      const tasks = await getLanpmApi().task.listTasks(groupId)
      get().setTasks(groupId, tasks)
    } finally {
      set((s) => ({ loading: { ...s.loading, [groupId]: false } }))
    }
  },

  createTask: async (input) => {
    const task = await getLanpmApi().task.createTask(input)
    await get().loadTasks(input.groupId)
    return task
  },

  updateTask: async (input) => {
    const task = await getLanpmApi().task.updateTask(input)
    const existing = get().tasksByGroup
    const groupId = Object.keys(existing).find((gid) =>
      existing[gid]?.some((t) => t.taskId === input.taskId)
    )
    if (groupId) await get().loadTasks(groupId)
    return task
  },

  updateSchedule: async (input) => {
    const task = await getLanpmApi().task.updateSchedule(input)
    const existing = get().tasksByGroup
    const groupId = Object.keys(existing).find((gid) =>
      existing[gid]?.some((t) => t.taskId === input.taskId)
    )
    if (groupId) {
      set((s) => ({
        tasksByGroup: {
          ...s.tasksByGroup,
          [groupId]: (s.tasksByGroup[groupId] ?? []).map((t) =>
            t.taskId === task.taskId ? task : t
          )
        }
      }))
    }
    return task
  },

  upsertDependency: async (input) => {
    await getLanpmApi().task.upsertDependency(input)
    await get().loadTasks(input.groupId)
  },

  moveTask: async (input) => {
    const task = await getLanpmApi().task.moveTask(input)
    const existing = get().tasksByGroup
    const groupId = Object.keys(existing).find((gid) =>
      existing[gid]?.some((t) => t.taskId === input.taskId)
    )
    if (groupId) await get().loadTasks(groupId)
    return task
  },

  deleteTask: async (taskId, mode) => {
    const existing = get().tasksByGroup
    const groupId = Object.keys(existing).find((gid) =>
      existing[gid]?.some((t) => t.taskId === taskId)
    )
    const ok = await getLanpmApi().task.deleteTask(taskId, mode)
    if (ok && groupId) await get().loadTasks(groupId)
    return ok
  },

  createFromChat: async (groupId, title, options) => {
    const result = await getLanpmApi().task.createFromChat(groupId, title, options)
    await get().loadTasks(groupId)
    return result
  },

  referenceFromChat: async (groupId, taskId) => {
    const result = await getLanpmApi().task.referenceFromChat(groupId, taskId)
    await get().loadTasks(groupId)
    return result
  }
}))

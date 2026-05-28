import { contextBridge, ipcRenderer } from 'electron'
import type { ChatMessage } from '../shared/chat/types'
import type { SetupInput } from '../shared/identity'
import type { LanpmApi } from '../shared/lanpm-api'
import { CHAT_PUSH_CHANNEL } from '../shared/chat/channels'
import { TASK_PUSH_CHANNEL } from '../shared/task/channels'
import { FILE_TRANSFER_PUSH_CHANNEL } from '../shared/file/channels'
import { GROUP_PUSH_CHANNEL } from '../shared/group/channels'

const api: LanpmApi = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  getSuggestedDeviceName: () =>
    ipcRenderer.sendSync('identity:getSuggestedDeviceNameSync') as string,
  identity: {
    getSetupStatus: () => ipcRenderer.invoke('identity:getStatus'),
    completeSetup: (input: SetupInput) => ipcRenderer.invoke('identity:completeSetup', input)
  },
  chat: {
    listMessages: (groupId) => ipcRenderer.invoke('chat:listMessages', groupId),
    sendText: (groupId, text) => ipcRenderer.invoke('chat:sendText', groupId, text),
    sendCode: (groupId, code, languageHint, theme) =>
      ipcRenderer.invoke('chat:sendCode', groupId, code, languageHint, theme),
    listMembers: (groupId) => ipcRenderer.invoke('chat:listMembers', groupId),
    markRead: (groupId, msgIds) => ipcRenderer.invoke('chat:markRead', groupId, msgIds),
    onMessage: (handler: (message: ChatMessage) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: ChatMessage) => {
        handler(message)
      }
      ipcRenderer.on(CHAT_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(CHAT_PUSH_CHANNEL, listener)
    }
  },
  task: {
    listTasks: (groupId) => ipcRenderer.invoke('task:listTasks', groupId),
    createTask: (input) => ipcRenderer.invoke('task:createTask', input),
    updateTask: (input) => ipcRenderer.invoke('task:updateTask', input),
    moveTask: (input) => ipcRenderer.invoke('task:moveTask', input),
    createFromChat: (groupId, title) =>
      ipcRenderer.invoke('task:createFromChat', groupId, title),
    updateSchedule: (input) => ipcRenderer.invoke('task:updateSchedule', input),
    upsertDependency: (input) => ipcRenderer.invoke('task:upsertDependency', input),
    removeDependency: (groupId, fromTaskId, toTaskId) =>
      ipcRenderer.invoke('task:removeDependency', groupId, fromTaskId, toTaskId),
    deleteTask: (taskId) => ipcRenderer.invoke('task:deleteTask', taskId),
    onTasksChanged: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, groupId: string) => {
        handler(groupId)
      }
      ipcRenderer.on(TASK_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(TASK_PUSH_CHANNEL, listener)
    }
  },
  file: {
    listFiles: (groupId, category) => ipcRenderer.invoke('file:list', groupId, category),
    upload: (groupId, filePath) => ipcRenderer.invoke('file:upload', groupId, filePath),
    getPreviewUrl: (fileId) => ipcRenderer.invoke('file:getPreviewUrl', fileId),
    listTransfers: (groupId) => ipcRenderer.invoke('file:listTransfers', groupId),
    addBookmark: (groupId, url, title) =>
      ipcRenderer.invoke('file:addBookmark', groupId, url, title),
    importBookmarks: (groupId) => ipcRenderer.invoke('file:importBookmarks', groupId),
    exportBookmarks: (groupId) => ipcRenderer.invoke('file:exportBookmarks', groupId),
    onTransfersChanged: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, groupId: string) => {
        handler(groupId)
      }
      ipcRenderer.on(FILE_TRANSFER_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(FILE_TRANSFER_PUSH_CHANNEL, listener)
    }
  },
  group: {
    list: () => ipcRenderer.invoke('group:list'),
    create: (input) => ipcRenderer.invoke('group:create', input),
    enterAnonymous: (groupId) => ipcRenderer.invoke('group:enterAnonymous', groupId),
    leaveAnonymous: (groupId) => ipcRenderer.invoke('group:leaveAnonymous', groupId),
    onListChanged: (handler) => {
      const listener = () => handler()
      ipcRenderer.on(GROUP_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(GROUP_PUSH_CHANNEL, listener)
    }
  },
  cockpit: {
    getDashboard: () => ipcRenderer.invoke('cockpit:getDashboard'),
    generateWeeklyReport: () => ipcRenderer.invoke('cockpit:generateWeeklyReport'),
    generateMonthlyReport: () => ipcRenderer.invoke('cockpit:generateMonthlyReport'),
    evaluateProjects: () => ipcRenderer.invoke('cockpit:evaluateProjects'),
    getAiConfig: () => ipcRenderer.invoke('cockpit:getAiConfig'),
    saveAiConfig: (input) => ipcRenderer.invoke('cockpit:saveAiConfig', input)
  },
  search: {
    query: (query) => ipcRenderer.invoke('search:query', query)
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

export type { LanpmApi }

import { contextBridge, ipcRenderer } from 'electron'
import type { ChatMessage } from '../shared/chat/types'
import type { SetupInput } from '../shared/identity'
import type { LanpmApi } from '../shared/lanpm-api'
import { CHAT_PUSH_CHANNEL } from '../shared/chat/channels'
import { TASK_PUSH_CHANNEL } from '../shared/task/channels'

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
    onTasksChanged: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, groupId: string) => {
        handler(groupId)
      }
      ipcRenderer.on(TASK_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(TASK_PUSH_CHANNEL, listener)
    }
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

export type { LanpmApi }

import { contextBridge, ipcRenderer } from 'electron'
import { hostname } from 'node:os'
import type { ChatMessage } from '../shared/chat/types'
import type { SetupInput } from '../shared/identity'
import { resolveDeviceName } from '../shared/identity/deviceName'
import type { LanpmApi } from '../shared/lanpm-api'
import { CHAT_PUSH_CHANNEL } from '../shared/chat/channels'

const api: LanpmApi = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  getSuggestedDeviceName: () => resolveDeviceName(hostname()),
  identity: {
    getSetupStatus: () => ipcRenderer.invoke('identity:getStatus'),
    completeSetup: (input: SetupInput) => ipcRenderer.invoke('identity:completeSetup', input)
  },
  chat: {
    listMessages: (groupId) => ipcRenderer.invoke('chat:listMessages', groupId),
    sendText: (groupId, text) => ipcRenderer.invoke('chat:sendText', groupId, text),
    sendCode: (groupId, code, languageHint, theme) =>
      ipcRenderer.invoke('chat:sendCode', groupId, code, languageHint, theme),
    onMessage: (handler: (message: ChatMessage) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: ChatMessage) => {
        handler(message)
      }
      ipcRenderer.on(CHAT_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(CHAT_PUSH_CHANNEL, listener)
    }
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

export type { LanpmApi }

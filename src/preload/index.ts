import { contextBridge, ipcRenderer } from 'electron'
import type { SetupInput } from '../shared/identity'
import type { LanpmApi } from '../shared/lanpm-api'

const api: LanpmApi = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  identity: {
    getSetupStatus: () => ipcRenderer.invoke('identity:getStatus'),
    completeSetup: (input: SetupInput) => ipcRenderer.invoke('identity:completeSetup', input)
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

export type { LanpmApi }

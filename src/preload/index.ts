import { contextBridge } from 'electron'

export interface LanpmApi {
  platform: NodeJS.Platform
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

const api: LanpmApi = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

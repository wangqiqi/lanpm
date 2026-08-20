import { contextBridge, ipcRenderer } from 'electron'
import { DB_UNLOCK_CHANNEL } from '../shared/data/dbUnlock.ts'

contextBridge.exposeInMainWorld('lanpmUnlock', {
  submit: (passphrase: string | null) => {
    ipcRenderer.send(DB_UNLOCK_CHANNEL, passphrase)
  }
})

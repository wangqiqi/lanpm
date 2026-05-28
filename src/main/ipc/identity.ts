import { ipcMain } from 'electron'
import { completeSetup, getSetupStatus, type SetupInput } from '../identity/setup'
import { getDatabase } from '../storage'

export const IDENTITY_CHANNELS = {
  getStatus: 'identity:getStatus',
  complete: 'identity:completeSetup'
} as const

export function registerIdentityIpc(): void {
  ipcMain.handle(IDENTITY_CHANNELS.getStatus, () => {
    return getSetupStatus(getDatabase())
  })

  ipcMain.handle(IDENTITY_CHANNELS.complete, (_event, input: SetupInput) => {
    return completeSetup(getDatabase(), input)
  })
}

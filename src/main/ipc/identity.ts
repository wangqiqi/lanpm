import { ipcMain } from 'electron'
import { completeSetup, getSetupStatus, getSuggestedDeviceName, type SetupInput } from '../identity/setup'
import { ensureSeedGroups } from '../group/groupService'
import { refreshNetworkIdentity } from '../network'
import { getDatabase } from '../storage'

export const IDENTITY_CHANNELS = {
  getStatus: 'identity:getStatus',
  complete: 'identity:completeSetup',
  getSuggestedDeviceNameSync: 'identity:getSuggestedDeviceNameSync'
} as const

export function registerIdentityIpc(): void {
  ipcMain.handle(IDENTITY_CHANNELS.getStatus, () => {
    return getSetupStatus(getDatabase())
  })

  ipcMain.on(IDENTITY_CHANNELS.getSuggestedDeviceNameSync, (event) => {
    event.returnValue = getSuggestedDeviceName()
  })

  ipcMain.handle(IDENTITY_CHANNELS.complete, (_event, input: SetupInput) => {
    const db = getDatabase()
    const status = completeSetup(db, input)
    ensureSeedGroups(db)
    refreshNetworkIdentity(db)
    return status
  })
}

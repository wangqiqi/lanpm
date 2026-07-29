import { ipcMain } from 'electron'
import {
  completeSetup,
  getSetupStatus,
  getSuggestedDeviceName,
  resetIdentity,
  updateProfile,
  type ProfileUpdateInput,
  type SetupInput
} from '../identity/setup'
import { ensureSeedGroups } from '../group/groupService'
import { initNetwork, refreshNetworkIdentity, shutdownNetwork } from '../network'
import { getDatabase } from '../storage'
import { bindProfileAfterSetup } from '../storage/profilePaths'

export const IDENTITY_CHANNELS = {
  getStatus: 'identity:getStatus',
  complete: 'identity:completeSetup',
  updateProfile: 'identity:updateProfile',
  reset: 'identity:resetIdentity',
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
    if (status.configured && status.user?.userId) {
      bindProfileAfterSetup(status.user.userId)
    }
    ensureSeedGroups(db)
    refreshNetworkIdentity(db)
    return status
  })

  ipcMain.handle(IDENTITY_CHANNELS.updateProfile, (_event, input: ProfileUpdateInput) => {
    const db = getDatabase()
    const status = updateProfile(db, input)
    refreshNetworkIdentity(db)
    return status
  })

  ipcMain.handle(IDENTITY_CHANNELS.reset, () => {
    const db = getDatabase()
    shutdownNetwork()
    const status = resetIdentity(db)
    initNetwork(db)
    return status
  })
}

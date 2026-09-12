import { ipcMain } from 'electron'
import {
  completeSetup,
  getSetupStatus,
  getSuggestedDeviceName,
  reactivateLocalIdentity,
  resetIdentity,
  updateProfile,
  type ProfileUpdateInput,
  type ReactivateInput,
  type SetupInput
} from '../identity/setup'
import { ensureSeedGroups } from '../group/groupService'
import { initNetwork, refreshNetworkIdentity, shutdownNetwork } from '../network'
import { closeDatabase, getDatabase, initDatabase } from '../storage'
import { bindProfileAfterSetup, prepareFreshProfileUserDataShell } from '../storage/profilePaths'
import { confirmDestructiveIpc } from './destructiveConfirm.ts'

export const IDENTITY_CHANNELS = {
  getStatus: 'identity:getStatus',
  complete: 'identity:completeSetup',
  reactivate: 'identity:reactivateLocalIdentity',
  updateProfile: 'identity:updateProfile',
  reset: 'identity:resetIdentity',
  getSuggestedDeviceNameSync: 'identity:getSuggestedDeviceNameSync'
} as const

function finalizeIdentityAfterBind(status: ReturnType<typeof getSetupStatus>): ReturnType<typeof getSetupStatus> {
  if (!status.configured || !status.user?.userId) {
    return status
  }
  shutdownNetwork()
  closeDatabase()
  bindProfileAfterSetup(status.user.userId)
  const dbAfter = initDatabase()
  ensureSeedGroups(dbAfter)
  refreshNetworkIdentity(dbAfter)
  return status
}

export function registerIdentityIpc(): void {
  ipcMain.handle(IDENTITY_CHANNELS.getStatus, () => {
    return getSetupStatus(getDatabase())
  })

  ipcMain.on(IDENTITY_CHANNELS.getSuggestedDeviceNameSync, (event) => {
    event.returnValue = getSuggestedDeviceName()
  })

  ipcMain.handle(IDENTITY_CHANNELS.complete, (_event, input: SetupInput) => {
    if (input.intent === 'new_user') {
      shutdownNetwork()
      closeDatabase()
      prepareFreshProfileUserDataShell()
      const freshDb = initDatabase()
      const status = completeSetup(freshDb, input)
      return finalizeIdentityAfterBind(status)
    }
    const db = getDatabase()
    const status = completeSetup(db, input)
    if (status.configured && status.user?.userId) {
      return finalizeIdentityAfterBind(status)
    }
    ensureSeedGroups(db)
    refreshNetworkIdentity(db)
    return status
  })

  ipcMain.handle(IDENTITY_CHANNELS.reactivate, (_event, input?: ReactivateInput) => {
    const db = getDatabase()
    const status = reactivateLocalIdentity(db, input)
    return finalizeIdentityAfterBind(status)
  })

  ipcMain.handle(IDENTITY_CHANNELS.updateProfile, (_event, input: ProfileUpdateInput) => {
    const db = getDatabase()
    const status = updateProfile(db, input)
    refreshNetworkIdentity(db)
    return status
  })

  ipcMain.handle(IDENTITY_CHANNELS.reset, async (event) => {
    const ok = await confirmDestructiveIpc(event.sender, 'resetIdentity')
    if (!ok) return getSetupStatus(getDatabase())
    const db = getDatabase()
    shutdownNetwork()
    const status = resetIdentity(db)
    initNetwork(db)
    return status
  })
}

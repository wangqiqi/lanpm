import { ipcMain } from 'electron'
import { NETWORK_IPC } from '../../shared/network/status'
import { BADGE_IPC } from '../../shared/badge/types'
import { fetchNetworkStatus, reconnectNetwork } from '../network'
import { getGroupTabBadges } from '../badge/badgeService'
import { getDatabase } from '../storage'

export function registerNetworkIpc(): void {
  ipcMain.handle(NETWORK_IPC.getStatus, () => fetchNetworkStatus())

  ipcMain.handle(NETWORK_IPC.reconnect, () => {
    reconnectNetwork(getDatabase())
    return fetchNetworkStatus()
  })
}

export function registerBadgeIpc(): void {
  ipcMain.handle(BADGE_IPC.getGroupTabBadges, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return getGroupTabBadges(getDatabase(), groupId)
  })
}

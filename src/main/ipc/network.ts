import { ipcMain } from 'electron'
import { NETWORK_IPC } from '../../shared/network/status'
import { BADGE_IPC } from '../../shared/badge/types'
import { parseHostPort } from '../../shared/network/manualPeer'
import { connectManualPeer, fetchNetworkStatus, reconnectNetwork } from '../network'
import { getGroupTabBadges } from '../badge/badgeService'
import { getDatabase } from '../storage'

export function registerNetworkIpc(): void {
  ipcMain.handle(NETWORK_IPC.getStatus, () => fetchNetworkStatus())

  ipcMain.handle(NETWORK_IPC.reconnect, () => {
    reconnectNetwork(getDatabase())
    return fetchNetworkStatus()
  })

  ipcMain.handle(NETWORK_IPC.connectManualPeer, (_event, address: string) => {
    if (typeof address !== 'string' || !address.trim()) {
      throw new Error('address required')
    }
    let host: string
    let port: number
    try {
      ;({ host, port } = parseHostPort(address))
    } catch {
      throw new Error('地址格式应为 host:port，例如 192.168.1.10:43124')
    }
    return connectManualPeer(host, port).then(() => fetchNetworkStatus())
  })
}

export function registerBadgeIpc(): void {
  ipcMain.handle(BADGE_IPC.getGroupTabBadges, (_event, groupId: string) => {
    if (typeof groupId !== 'string' || !groupId) throw new Error('groupId required')
    return getGroupTabBadges(getDatabase(), groupId)
  })
}

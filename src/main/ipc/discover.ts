import { ipcMain } from 'electron'
import { DISCOVER_IPC } from '../../shared/discover/channels'
import { fetchDiscoverSnapshot } from '../discover/discoverService'
import { getDatabase } from '../storage'

export function registerDiscoverIpc(): void {
  ipcMain.handle(DISCOVER_IPC.snapshot, () => fetchDiscoverSnapshot(getDatabase()))
}

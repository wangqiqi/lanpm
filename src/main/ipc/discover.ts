import { ipcMain } from 'electron'
import { DISCOVER_IPC } from '../../shared/discover/channels'
import { fetchDiscoverSnapshot, setDiscoverSeeds } from '../discover/discoverService'
import { getDatabase } from '../storage'

export function registerDiscoverIpc(): void {
  ipcMain.handle(DISCOVER_IPC.snapshot, () => fetchDiscoverSnapshot(getDatabase()))
  ipcMain.handle(DISCOVER_IPC.setSeeds, (_event, seeds: unknown) => {
    const next = setDiscoverSeeds(getDatabase(), seeds)
    return fetchDiscoverSnapshot(getDatabase(), { connectSeeds: true }).then((snap) => ({
      ...snap,
      seeds: next
    }))
  })
}

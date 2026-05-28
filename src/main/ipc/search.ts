import { ipcMain } from 'electron'
import { SEARCH_IPC } from '../../shared/search/channels'
import { globalSearch } from '../search/searchService'
import { getDatabase } from '../storage'

export function registerSearchIpc(): void {
  ipcMain.handle(SEARCH_IPC.query, (_event, query: string) => {
    if (typeof query !== 'string') throw new Error('query required')
    return globalSearch(getDatabase(), query)
  })
}

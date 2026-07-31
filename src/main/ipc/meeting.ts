import { ipcMain } from 'electron'
import { MEETING_IPC } from '../../shared/media/channels.ts'
import { toLiveKitConfigPublic } from '../../shared/media/livekitConfig.ts'
import { readLiveKitConfig, writeLiveKitConfig } from '../media/liveKitConfigStore.ts'

export function registerMeetingIpc(): void {
  ipcMain.handle(MEETING_IPC.getLiveKitConfig, () => {
    return toLiveKitConfigPublic(readLiveKitConfig())
  })

  ipcMain.handle(MEETING_IPC.setLiveKitConfig, (_event, input: unknown) => {
    const saved = writeLiveKitConfig(input)
    return toLiveKitConfigPublic(saved)
  })
}

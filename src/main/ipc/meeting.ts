import { ipcMain, BrowserWindow } from 'electron'
import { writeFileSync } from 'fs'
import { MEETING_IPC } from '../../shared/media/channels.ts'
import { toLiveKitConfigPublic } from '../../shared/media/livekitConfig.ts'
import { readLiveKitConfig, writeLiveKitConfig } from '../media/liveKitConfigStore.ts'
import {
  createMeetingSchedule,
  deleteMeetingSchedule,
  listMeetingSchedules
} from '../media/meetingScheduleStore.ts'
import { showSaveDialog } from '../systemDialog.ts'

function toUint8Array(input: unknown): Uint8Array | null {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (Array.isArray(input) && input.every((n) => typeof n === 'number')) {
    return Uint8Array.from(input)
  }
  return null
}

export function registerMeetingIpc(): void {
  ipcMain.handle(MEETING_IPC.getLiveKitConfig, () => {
    return toLiveKitConfigPublic(readLiveKitConfig())
  })

  ipcMain.handle(MEETING_IPC.setLiveKitConfig, (_event, input: unknown) => {
    const saved = writeLiveKitConfig(input)
    return toLiveKitConfigPublic(saved)
  })

  ipcMain.handle(MEETING_IPC.saveRecording, async (event, payload: unknown) => {
    const o = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}
    const bytes = toUint8Array(o.bytes)
    if (!bytes || bytes.length === 0) {
      throw new Error('Recording bytes required')
    }
    const suggested =
      typeof o.suggestedName === 'string' && o.suggestedName.trim()
        ? o.suggestedName.trim()
        : `meeting-recording-${Date.now()}.webm`

    const parent = BrowserWindow.fromWebContents(event.sender)
    const result = await showSaveDialog(parent, {
      title: '保存会议录制',
      defaultPath: suggested,
      filters: [{ name: 'WebM Video', extensions: ['webm'] }]
    })
    if (result.canceled || !result.filePath) {
      return { saved: false as const }
    }
    writeFileSync(result.filePath, bytes)
    return { saved: true as const, path: result.filePath }
  })

  ipcMain.handle(MEETING_IPC.listSchedules, (_event, groupId?: unknown) => {
    const gid = typeof groupId === 'string' && groupId.trim() ? groupId.trim() : undefined
    return listMeetingSchedules(gid)
  })

  ipcMain.handle(MEETING_IPC.createSchedule, (_event, input: unknown) => {
    return createMeetingSchedule(input)
  })

  ipcMain.handle(MEETING_IPC.deleteSchedule, (_event, payload: unknown) => {
    const id =
      payload && typeof payload === 'object' && typeof (payload as { id?: unknown }).id === 'string'
        ? (payload as { id: string }).id
        : ''
    if (!deleteMeetingSchedule(id)) {
      throw new Error('Schedule not found')
    }
    return { ok: true as const }
  })
}

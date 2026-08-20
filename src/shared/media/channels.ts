/** Meeting / LiveKit IPC channels */
export const MEETING_IPC = {
  getLiveKitConfig: 'meeting:getLiveKitConfig',
  setLiveKitConfig: 'meeting:setLiveKitConfig',
  saveRecording: 'meeting:saveRecording',
  listSchedules: 'meeting:listSchedules',
  createSchedule: 'meeting:createSchedule',
  updateSchedule: 'meeting:updateSchedule',
  deleteSchedule: 'meeting:deleteSchedule'
} as const

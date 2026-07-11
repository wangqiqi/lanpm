import { create } from 'zustand'
import {
  getNotifyAllMessages,
  getNotifyDueTasks,
  setNotifyAllMessages,
  setNotifyDueTasks
} from '@shared/chat/notificationPreferences'

interface NotificationPrefsState {
  notifyAllMessages: boolean
  notifyDueTasks: boolean
  hydrate: () => void
  setNotifyAllMessages: (enabled: boolean) => void
  setNotifyDueTasks: (enabled: boolean) => void
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set) => ({
  notifyAllMessages: getNotifyAllMessages(),
  notifyDueTasks: getNotifyDueTasks(),
  hydrate: () =>
    set({
      notifyAllMessages: getNotifyAllMessages(),
      notifyDueTasks: getNotifyDueTasks()
    }),
  setNotifyAllMessages: (enabled) => {
    setNotifyAllMessages(enabled)
    set({ notifyAllMessages: enabled })
  },
  setNotifyDueTasks: (enabled) => {
    setNotifyDueTasks(enabled)
    set({ notifyDueTasks: enabled })
  }
}))

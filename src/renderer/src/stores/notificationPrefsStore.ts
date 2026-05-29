import { create } from 'zustand'
import {
  getNotifyAllMessages,
  setNotifyAllMessages
} from '@shared/chat/notificationPreferences'

interface NotificationPrefsState {
  notifyAllMessages: boolean
  hydrate: () => void
  setNotifyAllMessages: (enabled: boolean) => void
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set) => ({
  notifyAllMessages: getNotifyAllMessages(),
  hydrate: () => set({ notifyAllMessages: getNotifyAllMessages() }),
  setNotifyAllMessages: (enabled) => {
    setNotifyAllMessages(enabled)
    set({ notifyAllMessages: enabled })
  }
}))

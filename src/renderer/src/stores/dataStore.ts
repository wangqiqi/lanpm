import { create } from 'zustand'
import type {
  DataCleanupOptions,
  DataCleanupResult,
  DataStorageSettingsView
} from '@shared/data/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface DataState {
  settings: DataStorageSettingsView | null
  usage: { messageCount: number; fileCount: number } | null
  loading: boolean
  loadSettings: () => Promise<void>
  setRetentionDays: (days: number) => Promise<number>
  runCleanup: (options: DataCleanupOptions) => Promise<DataCleanupResult>
  clearGroupMessages: (
    groupId: string,
    mode: 'older_than_retention' | 'all_local'
  ) => Promise<number>
}

export const useDataStore = create<DataState>((set) => ({
  settings: null,
  usage: null,
  loading: false,
  loadSettings: async () => {
    set({ loading: true })
    try {
      const [settings, usage] = await Promise.all([
        getLanpmApi().data.getStorageSettings(),
        getLanpmApi().data.getStorageUsage()
      ])
      set({ settings, usage })
    } finally {
      set({ loading: false })
    }
  },
  setRetentionDays: async (days) => {
    const next = await getLanpmApi().data.setLocalRetentionDays(days)
    const settings = await getLanpmApi().data.getStorageSettings()
    const usage = await getLanpmApi().data.getStorageUsage()
    set({ settings, usage })
    return next
  },
  runCleanup: async (options) => {
    const result = await getLanpmApi().data.runCleanup(options)
    const [settings, usage] = await Promise.all([
      getLanpmApi().data.getStorageSettings(),
      getLanpmApi().data.getStorageUsage()
    ])
    set({ settings, usage })
    return result
  },
  clearGroupMessages: async (groupId, mode) => {
    const n = await getLanpmApi().data.clearGroupMessages(groupId, mode)
    const usage = await getLanpmApi().data.getStorageUsage()
    set({ usage })
    return n
  }
}))

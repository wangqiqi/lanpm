import { create } from 'zustand'
import type { FileCategory, FileMeta, FileTransferView } from '@shared/file/types'
import type { FileTransferSettingsView } from '@shared/file/settings'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface FileState {
  filesByGroup: Record<string, FileMeta[]>
  transfersByGroup: Record<string, FileTransferView[]>
  transferHistoryByGroup: Record<string, FileTransferView[]>
  transferSettings: FileTransferSettingsView | null
  loading: Record<string, boolean>
  loadFiles: (groupId: string, category?: FileCategory) => Promise<void>
  loadTransfers: (groupId: string) => Promise<void>
  loadTransferHistory: (groupId: string) => Promise<void>
  loadTransferSettings: () => Promise<void>
  setTransferRate: (rateKbps: number) => Promise<void>
  resumeTransfer: (groupId: string, transferId: string) => Promise<void>
  upload: (groupId: string) => Promise<FileMeta | null>
  addBookmark: (groupId: string, url: string, title: string) => Promise<FileMeta>
  importBookmarks: (groupId: string) => Promise<FileMeta[]>
  exportBookmarks: (groupId: string) => Promise<string | null>
}

export const useFileStore = create<FileState>((set) => ({
  filesByGroup: {},
  transfersByGroup: {},
  transferHistoryByGroup: {},
  transferSettings: null,
  loading: {},

  loadFiles: async (groupId, category) => {
    set((s) => ({ loading: { ...s.loading, [groupId]: true } }))
    try {
      const files = await getLanpmApi().file.listFiles(groupId, category)
      set((s) => ({ filesByGroup: { ...s.filesByGroup, [groupId]: files } }))
    } finally {
      set((s) => ({ loading: { ...s.loading, [groupId]: false } }))
    }
  },

  loadTransfers: async (groupId) => {
    const transfers = await getLanpmApi().file.listTransfers(groupId)
    set((s) => ({ transfersByGroup: { ...s.transfersByGroup, [groupId]: transfers } }))
  },

  loadTransferHistory: async (groupId) => {
    const history = await getLanpmApi().file.listTransferHistory(groupId)
    set((s) => ({ transferHistoryByGroup: { ...s.transferHistoryByGroup, [groupId]: history } }))
  },

  loadTransferSettings: async () => {
    const settings = await getLanpmApi().file.getTransferSettings()
    set({ transferSettings: settings })
  },

  setTransferRate: async (rateKbps) => {
    const settings = await getLanpmApi().file.setTransferRate(rateKbps)
    set({ transferSettings: settings })
  },

  resumeTransfer: async (groupId, transferId) => {
    await getLanpmApi().file.resumeTransfer(transferId)
    const transfers = await getLanpmApi().file.listTransfers(groupId)
    const history = await getLanpmApi().file.listTransferHistory(groupId)
    set((s) => ({
      transfersByGroup: { ...s.transfersByGroup, [groupId]: transfers },
      transferHistoryByGroup: { ...s.transferHistoryByGroup, [groupId]: history }
    }))
  },

  upload: async (groupId) => {
    const meta = await getLanpmApi().file.upload(groupId)
    if (meta) {
      const files = await getLanpmApi().file.listFiles(groupId)
      set((s) => ({ filesByGroup: { ...s.filesByGroup, [groupId]: files } }))
    }
    return meta
  },

  addBookmark: async (groupId, url, title) => getLanpmApi().file.addBookmark(groupId, url, title),

  importBookmarks: async (groupId) => getLanpmApi().file.importBookmarks(groupId),

  exportBookmarks: async (groupId) => getLanpmApi().file.exportBookmarks(groupId)
}))

import { create } from 'zustand'
import type { FileCategory, FileMeta, FileTransferView } from '@shared/file/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface FileState {
  filesByGroup: Record<string, FileMeta[]>
  transfersByGroup: Record<string, FileTransferView[]>
  loading: Record<string, boolean>
  loadFiles: (groupId: string, category?: FileCategory) => Promise<void>
  loadTransfers: (groupId: string) => Promise<void>
  upload: (groupId: string) => Promise<FileMeta | null>
  addBookmark: (groupId: string, url: string, title: string) => Promise<FileMeta>
  importBookmarks: (groupId: string) => Promise<FileMeta[]>
  exportBookmarks: (groupId: string) => Promise<string | null>
}

export const useFileStore = create<FileState>((set) => ({
  filesByGroup: {},
  transfersByGroup: {},
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

import { create } from 'zustand'
import type {
  MindmapDocument,
  MindmapDocumentSummary
} from '@shared/mindmap/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

type SerializeFn = () => string
type ExportPngFn = () => Promise<Blob | null>

interface MindmapDocumentState {
  groupId: string | null
  docId: string | null
  title: string
  dirty: boolean
  saving: boolean
  documents: MindmapDocumentSummary[]
  serialize: SerializeFn | null
  exportPng: ExportPngFn | null
  registerSerializer: (fn: SerializeFn | null) => void
  registerExportPng: (fn: ExportPngFn | null) => void
  setDirty: (dirty: boolean) => void
  refreshList: (groupId: string) => Promise<void>
  openDocument: (docId: string) => Promise<string | null>
  createDocument: (groupId: string, title?: string) => Promise<MindmapDocument | null>
  saveCurrent: () => Promise<boolean>
  renameCurrent: (title: string) => Promise<boolean>
  deleteCurrent: () => Promise<boolean>
  reset: () => void
}

export const useMindmapDocumentStore = create<MindmapDocumentState>((set, get) => ({
  groupId: null,
  docId: null,
  title: '',
  dirty: false,
  saving: false,
  documents: [],
  serialize: null,
  exportPng: null,
  registerSerializer: (fn) => set({ serialize: fn }),
  registerExportPng: (fn) => set({ exportPng: fn }),
  setDirty: (dirty) => set({ dirty }),
  refreshList: async (groupId) => {
    const documents = await getLanpmApi().mindmap.list(groupId)
    set({ documents, groupId })
  },
  openDocument: async (docId) => {
    const loaded = await getLanpmApi().mindmap.load(docId)
    if (!loaded) return null
    set({
      groupId: loaded.groupId,
      docId: loaded.docId,
      title: loaded.title,
      dirty: false
    })
    return loaded.dataJson
  },
  createDocument: async (groupId, title) => {
    const doc = await getLanpmApi().mindmap.create({ groupId, title })
    await get().refreshList(groupId)
    set({
      groupId: doc.groupId,
      docId: doc.docId,
      title: doc.title,
      dirty: false
    })
    return doc
  },
  saveCurrent: async () => {
    const { docId, serialize, saving } = get()
    if (!docId || !serialize || saving) return false
    set({ saving: true })
    try {
      await getLanpmApi().mindmap.save({ docId, dataJson: serialize() })
      set({ dirty: false, saving: false })
      const { groupId } = get()
      if (groupId) await get().refreshList(groupId)
      return true
    } catch {
      set({ saving: false })
      return false
    }
  },
  renameCurrent: async (title) => {
    const { docId, groupId } = get()
    if (!docId) return false
    const doc = await getLanpmApi().mindmap.rename({ docId, title })
    set({ title: doc.title })
    if (groupId) await get().refreshList(groupId)
    return true
  },
  deleteCurrent: async () => {
    const { docId, groupId } = get()
    if (!docId) return false
    await getLanpmApi().mindmap.delete(docId)
    set({ docId: null, title: '', dirty: false })
    if (groupId) await get().refreshList(groupId)
    return true
  },
  reset: () =>
    set({
      groupId: null,
      docId: null,
      title: '',
      dirty: false,
      saving: false,
      documents: [],
      serialize: null,
      exportPng: null
    })
}))

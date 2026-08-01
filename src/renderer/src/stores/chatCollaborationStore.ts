import { create } from 'zustand'

export type ChatCollaborationPanel = 'files' | 'whiteboard' | 'mindmap'

export interface ChatCollaborationOpenOptions {
  /** 打开文件库时预选并预览该文件（聊天附件、任务附件等） */
  selectFileId?: string
  /** 打开白板时关联任务（任务详情「打开白板」等） */
  linkTaskId?: string
}

interface ChatCollaborationState {
  panel: ChatCollaborationPanel | null
  pendingSelectFileId: string | null
  pendingLinkTaskId: string | null
  open: (panel: ChatCollaborationPanel, options?: ChatCollaborationOpenOptions) => void
  close: () => void
  clearPendingSelectFileId: () => void
  clearPendingLinkTaskId: () => void
}

export const useChatCollaborationStore = create<ChatCollaborationState>((set) => ({
  panel: null,
  pendingSelectFileId: null,
  pendingLinkTaskId: null,
  open: (panel, options) =>
    set({
      panel,
      pendingSelectFileId:
        panel === 'files' ? (options?.selectFileId?.trim() || null) : null,
      pendingLinkTaskId:
        panel === 'whiteboard' ? (options?.linkTaskId?.trim() || null) : null
    }),
  close: () => set({ panel: null, pendingSelectFileId: null, pendingLinkTaskId: null }),
  clearPendingSelectFileId: () => set({ pendingSelectFileId: null }),
  clearPendingLinkTaskId: () => set({ pendingLinkTaskId: null })
}))

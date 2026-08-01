import { create } from 'zustand'

export type ChatCollaborationPanel = 'files' | 'whiteboard' | 'mindmap'

interface ChatCollaborationState {
  panel: ChatCollaborationPanel | null
  open: (panel: ChatCollaborationPanel) => void
  close: () => void
}

export const useChatCollaborationStore = create<ChatCollaborationState>((set) => ({
  panel: null,
  open: (panel) => set({ panel }),
  close: () => set({ panel: null })
}))

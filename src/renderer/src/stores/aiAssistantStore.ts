import { create } from 'zustand'
import type { AiEntrySource, AiThreadContext } from '@shared/ai/types'

export type AiShellLayout = 'dock' | 'drawer' | 'fullscreen'

export interface OpenAiAssistantOptions {
  groupId?: string | null
  threadId?: string
  context?: AiThreadContext | null
  composerPrefill?: string
  layout?: AiShellLayout
  entrySource?: AiEntrySource
}

interface AiAssistantState {
  open: boolean
  layout: AiShellLayout
  groupId: string | null
  threadId: string | null
  context: AiThreadContext | null
  composerPrefill: string
  entrySource: AiEntrySource
  openAssistant: (opts?: OpenAiAssistantOptions) => void
  closeAssistant: () => void
  setThreadId: (threadId: string | null) => void
  setLayout: (layout: AiShellLayout) => void
}

export const useAiAssistantStore = create<AiAssistantState>((set) => ({
  open: false,
  layout: 'drawer',
  groupId: null,
  threadId: null,
  context: null,
  composerPrefill: '',
  entrySource: 'global',
  openAssistant: (opts = {}) =>
    set({
      open: true,
      layout: opts.layout ?? 'drawer',
      groupId: opts.groupId ?? null,
      threadId: opts.threadId ?? null,
      context: opts.context ?? null,
      composerPrefill: opts.composerPrefill ?? '',
      entrySource: opts.entrySource ?? 'global'
    }),
  closeAssistant: () => set({ open: false }),
  setThreadId: (threadId) => set({ threadId }),
  setLayout: (layout) => set({ layout })
}))

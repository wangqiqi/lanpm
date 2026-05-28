import { create } from 'zustand'

interface AppState {
  phase: string
  setPhase: (phase: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'M1',
  setPhase: (phase) => set({ phase })
}))

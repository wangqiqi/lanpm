import { create } from 'zustand'
import {
  DEFAULT_NAV_PREFERENCES,
  normalizeNavPreferences,
  type NavPreferences
} from '@shared/navigation/navPreferences'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface NavPreferencesState {
  preferences: NavPreferences
  hydrated: boolean
  hydrate: () => Promise<void>
  setPreferences: (prefs: NavPreferences) => Promise<void>
}

export const useNavPreferencesStore = create<NavPreferencesState>((set) => ({
  preferences: normalizeNavPreferences(DEFAULT_NAV_PREFERENCES),
  hydrated: false,
  hydrate: async () => {
    try {
      const prefs = await getLanpmApi().nav.getPreferences()
      set({ preferences: normalizeNavPreferences(prefs), hydrated: true })
    } catch {
      set({ preferences: normalizeNavPreferences(DEFAULT_NAV_PREFERENCES), hydrated: true })
    }
  },
  setPreferences: async (prefs) => {
    const saved = await getLanpmApi().nav.setPreferences(prefs)
    set({ preferences: normalizeNavPreferences(saved) })
  }
}))

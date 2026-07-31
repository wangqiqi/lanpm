import { create } from 'zustand'
import {
  DEFAULT_NAV_PREFERENCES,
  DEFAULT_NAV_PREFERENCES_DOCUMENT,
  hasGroupNavOverride,
  normalizeNavPreferences,
  normalizeNavPreferencesDocument,
  resolveNavPreferencesForGroup,
  type NavPreferences,
  type NavPreferencesDocument
} from '@shared/navigation/navPreferences'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

export type NavEditScope = 'global' | 'group'

interface NavPreferencesState {
  document: NavPreferencesDocument
  /** 当前群有效偏好（BottomNav / 路由守卫） */
  preferences: NavPreferences
  activeGroupId: string | null
  editScope: NavEditScope
  hydrated: boolean
  hydrate: () => Promise<void>
  setActiveGroupId: (groupId: string | null) => void
  setEditScope: (scope: NavEditScope) => void
  setPreferences: (prefs: NavPreferences) => Promise<void>
  clearGroupOverride: (groupId: string) => Promise<void>
}

function applyDocument(
  document: NavPreferencesDocument,
  activeGroupId: string | null
): Pick<NavPreferencesState, 'document' | 'preferences'> {
  const normalized = normalizeNavPreferencesDocument(document)
  return {
    document: normalized,
    preferences: resolveNavPreferencesForGroup(normalized, activeGroupId)
  }
}

export function selectEditingPreferences(state: NavPreferencesState): NavPreferences {
  if (state.editScope === 'group' && state.activeGroupId) {
    const override = state.document.byGroup[state.activeGroupId]
    return normalizeNavPreferences(override ?? state.document.global)
  }
  return state.document.global
}

export const useNavPreferencesStore = create<NavPreferencesState>((set, get) => ({
  document: normalizeNavPreferencesDocument(DEFAULT_NAV_PREFERENCES_DOCUMENT),
  preferences: normalizeNavPreferences(DEFAULT_NAV_PREFERENCES),
  activeGroupId: null,
  editScope: 'global',
  hydrated: false,
  hydrate: async () => {
    try {
      const doc = await getLanpmApi().nav.getDocument()
      const activeGroupId = get().activeGroupId
      set({ ...applyDocument(doc, activeGroupId), hydrated: true })
    } catch {
      const activeGroupId = get().activeGroupId
      set({
        ...applyDocument(DEFAULT_NAV_PREFERENCES_DOCUMENT, activeGroupId),
        hydrated: true
      })
    }
  },
  setActiveGroupId: (groupId) => {
    const { document } = get()
    set({
      activeGroupId: groupId,
      preferences: resolveNavPreferencesForGroup(document, groupId)
    })
  },
  setEditScope: (scope) => set({ editScope: scope }),
  setPreferences: async (prefs) => {
    const { editScope, activeGroupId, document } = get()
    const normalized = normalizeNavPreferences(prefs)
    if (editScope === 'group' && activeGroupId) {
      const saved = await getLanpmApi().nav.setGroupPreferences(activeGroupId, normalized)
      const nextDoc: NavPreferencesDocument = {
        ...document,
        byGroup: { ...document.byGroup, [activeGroupId]: normalizeNavPreferences(saved) }
      }
      set(applyDocument(nextDoc, activeGroupId))
      return
    }
    const saved = await getLanpmApi().nav.setPreferences(normalized)
    const nextDoc: NavPreferencesDocument = {
      ...document,
      global: normalizeNavPreferences(saved)
    }
    set(applyDocument(nextDoc, activeGroupId))
  },
  clearGroupOverride: async (groupId) => {
    const trimmed = groupId.trim()
    if (!trimmed) return
    const doc = await getLanpmApi().nav.clearGroupOverride(trimmed)
    const activeGroupId = get().activeGroupId
    set(applyDocument(doc, activeGroupId))
  }
}))

export { hasGroupNavOverride }

/**
 * Group tag dictionary colors (synced via group_tag_patch).
 */
import { create } from 'zustand'
import type { GroupTagMeta } from '@shared/task/groupTagMeta'
import { groupTagMetaToColorMap } from '@shared/task/groupTagMeta'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useUiStore } from './uiStore'

type GroupTagState = {
  byGroup: Record<string, GroupTagMeta[]>
  setGroup: (groupId: string, rows: GroupTagMeta[]) => void
  colorMap: (groupId: string) => Record<string, string>
  load: (groupId: string) => Promise<void>
  upsert: (groupId: string, tagKey: string, color: string) => Promise<void>
  ensureImported: (groupId: string) => Promise<void>
}

export const useGroupTagStore = create<GroupTagState>((set, get) => ({
  byGroup: {},
  setGroup: (groupId, rows) =>
    set((s) => ({ byGroup: { ...s.byGroup, [groupId]: rows } })),
  colorMap: (groupId) => groupTagMetaToColorMap(get().byGroup[groupId] ?? []),
  load: async (groupId) => {
    const rows = await getLanpmApi().task.listGroupTags(groupId)
    get().setGroup(groupId, rows)
  },
  upsert: async (groupId, tagKey, color) => {
    await getLanpmApi().task.upsertGroupTag(groupId, tagKey, color)
    await get().load(groupId)
  },
  ensureImported: async (groupId) => {
    const local = useUiStore.getState().tagColorOverridesByGroup[groupId] ?? {}
    if (Object.keys(local).length === 0) {
      await get().load(groupId)
      return
    }
    await getLanpmApi().task.importLocalTagColors(groupId, local)
    await get().load(groupId)
  }
}))

let unsub: (() => void) | null = null

export function wireGroupTagPush(): void {
  if (unsub) return
  unsub = getLanpmApi().task.onGroupTagsChanged((groupId) => {
    void useGroupTagStore.getState().load(groupId)
  })
}

export function unwireGroupTagPush(): void {
  unsub?.()
  unsub = null
}

/**
 * Renderer store for remote task focus Presence (TASK-179+).
 */
import { create } from 'zustand'
import type { TaskAwarenessLocalState } from '@shared/task/taskAwareness'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

export type AwarenessPeer = TaskAwarenessLocalState & { clientId?: number }

type AwarenessState = {
  /** groupId → peers */
  byGroup: Record<string, AwarenessPeer[]>
  setPeers: (groupId: string, peers: AwarenessPeer[]) => void
  clearGroup: (groupId: string) => void
  peersForTask: (groupId: string, taskId: string) => AwarenessPeer[]
}

export const useTaskAwarenessStore = create<AwarenessState>((set, get) => ({
  byGroup: {},
  setPeers: (groupId, peers) =>
    set((s) => ({ byGroup: { ...s.byGroup, [groupId]: peers } })),
  clearGroup: (groupId) =>
    set((s) => {
      const next = { ...s.byGroup }
      delete next[groupId]
      return { byGroup: next }
    }),
  peersForTask: (groupId, taskId) =>
    (get().byGroup[groupId] ?? []).filter((p) => p.focusedTaskId === taskId)
}))

let unsub: (() => void) | null = null

/** Subscribe once to main-process awareness pushes. */
export function wireTaskAwarenessPush(): void {
  if (unsub) return
  unsub = getLanpmApi().task.onAwarenessChanged(({ groupId, peers }) => {
    useTaskAwarenessStore.getState().setPeers(groupId, peers)
  })
}

export function unwireTaskAwarenessPush(): void {
  unsub?.()
  unsub = null
}

/** Publish local focus; pass null to clear (leave view). */
export async function publishLocalAwareness(
  groupId: string,
  state: TaskAwarenessLocalState | null
): Promise<void> {
  const peers = await getLanpmApi().task.setAwareness(groupId, state)
  useTaskAwarenessStore.getState().setPeers(groupId, peers)
}

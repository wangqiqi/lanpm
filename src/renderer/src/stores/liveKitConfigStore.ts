import { create } from 'zustand'
import type { LiveKitConfig, LiveKitConfigPublic } from '@shared/media/livekitConfig'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

type LiveKitConfigState = {
  publicConfig: LiveKitConfigPublic | null
  hydrated: boolean
  hydrate: () => Promise<void>
  setConfig: (input: LiveKitConfig) => Promise<LiveKitConfigPublic>
}

export const useLiveKitConfigStore = create<LiveKitConfigState>((set) => ({
  publicConfig: null,
  hydrated: false,
  hydrate: async () => {
    const publicConfig = await getLanpmApi().meeting.getLiveKitConfig()
    set({ publicConfig, hydrated: true })
  },
  setConfig: async (input) => {
    const publicConfig = await getLanpmApi().meeting.setLiveKitConfig(input)
    set({ publicConfig, hydrated: true })
    return publicConfig
  }
}))

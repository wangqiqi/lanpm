import { create } from 'zustand'
import type { NetworkStatusView } from '@shared/network/status'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface NetworkStore {
  status: NetworkStatusView | null
  loading: boolean
  refresh: () => Promise<void>
  reconnect: () => Promise<void>
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  status: null,
  loading: false,
  refresh: async () => {
    set({ loading: true })
    try {
      const status = await getLanpmApi().network.getStatus()
      set({ status })
    } finally {
      set({ loading: false })
    }
  },
  reconnect: async () => {
    set({ loading: true })
    try {
      const status = await getLanpmApi().network.reconnect()
      set({ status })
    } finally {
      set({ loading: false })
    }
  }
}))

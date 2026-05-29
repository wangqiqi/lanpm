import { create } from 'zustand'
import type { NetworkStatusView } from '@shared/network/status'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'

interface NetworkStore {
  status: NetworkStatusView | null
  loading: boolean
  refresh: (options?: { silent?: boolean }) => Promise<void>
  reconnect: () => Promise<void>
}

export const useNetworkStore = create<NetworkStore>((set) => ({
  status: null,
  loading: false,
  refresh: async (options) => {
    if (!options?.silent) set({ loading: true })
    try {
      const status = await getLanpmApi().network.getStatus()
      set({ status })
    } catch {
      /* 主进程未注册 IPC 或预览桩不可用时忽略，避免阻塞页面 */
    } finally {
      if (!options?.silent) set({ loading: false })
    }
  },
  reconnect: async () => {
    set({ loading: true })
    try {
      const status = await getLanpmApi().network.reconnect()
      set({ status })
    } catch {
      /* 同上 */
    } finally {
      set({ loading: false })
    }
  }
}))

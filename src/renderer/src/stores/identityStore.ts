import { create } from 'zustand'
import type { SetupDeviceView, SetupUserView } from '@shared/identity'

interface IdentityState {
  configured: boolean
  user: SetupUserView | null
  device: SetupDeviceView | null
  hydrated: boolean
  setFromStatus: (configured: boolean, user?: SetupUserView, device?: SetupDeviceView) => void
  setHydrated: (hydrated: boolean) => void
}

export const useIdentityStore = create<IdentityState>((set) => ({
  configured: false,
  user: null,
  device: null,
  hydrated: false,
  setFromStatus: (configured, user, device) =>
    set({ configured, user: user ?? null, device: device ?? null, hydrated: true }),
  setHydrated: (hydrated) => set({ hydrated })
}))

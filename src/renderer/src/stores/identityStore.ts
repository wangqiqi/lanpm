import { create } from 'zustand'
import type { SetupDeviceView, SetupUserView } from '@shared/identity'

interface IdentityState {
  configured: boolean
  user: SetupUserView | null
  device: SetupDeviceView | null
  hydrated: boolean
  bootFailed: boolean
  setFromStatus: (configured: boolean, user?: SetupUserView, device?: SetupDeviceView) => void
  setHydrated: (hydrated: boolean) => void
  setBootFailed: (failed: boolean) => void
}

export const useIdentityStore = create<IdentityState>((set) => ({
  configured: false,
  user: null,
  device: null,
  hydrated: false,
  bootFailed: false,
  setFromStatus: (configured, user, device) =>
    set({
      configured,
      user: user ?? null,
      device: device ?? null,
      hydrated: true,
      bootFailed: false
    }),
  setHydrated: (hydrated) => set({ hydrated }),
  setBootFailed: (bootFailed) => set({ bootFailed, hydrated: true })
}))

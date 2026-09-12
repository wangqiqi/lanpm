import { create } from 'zustand'
import type { SetupDeviceView, SetupUserView } from '@shared/identity'

interface IdentityState {
  configured: boolean
  user: SetupUserView | null
  device: SetupDeviceView | null
  needsRelaunch: boolean
  hydrated: boolean
  bootFailed: boolean
  setFromStatus: (
    configured: boolean,
    user?: SetupUserView,
    device?: SetupDeviceView,
    needsRelaunch?: boolean
  ) => void
  setHydrated: (hydrated: boolean) => void
  setBootFailed: (failed: boolean) => void
}

export const useIdentityStore = create<IdentityState>((set) => ({
  configured: false,
  user: null,
  device: null,
  needsRelaunch: false,
  hydrated: false,
  bootFailed: false,
  setFromStatus: (configured, user, device, needsRelaunch) =>
    set({
      configured,
      user: user ?? null,
      device: device ?? null,
      needsRelaunch: configured ? false : Boolean(needsRelaunch),
      hydrated: true,
      bootFailed: false
    }),
  setHydrated: (hydrated) => set({ hydrated }),
  setBootFailed: (bootFailed) => set({ bootFailed, hydrated: true })
}))

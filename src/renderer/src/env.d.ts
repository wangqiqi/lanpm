import type { LanpmApi } from '../../shared/lanpm-api'

declare global {
  interface Window {
    lanpm: LanpmApi
  }
}

export {}

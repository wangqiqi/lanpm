import type { SetupInput, SetupStatus } from './identity'

export interface LanpmApi {
  platform: NodeJS.Platform | 'browser'
  versions: {
    node: string
    chrome: string
    electron: string
  }
  identity: {
    getSetupStatus: () => Promise<SetupStatus>
    completeSetup: (input: SetupInput) => Promise<SetupStatus>
  }
}

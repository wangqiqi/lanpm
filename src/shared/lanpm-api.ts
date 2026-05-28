import type { ChatMessage } from './chat/types'
import type { GroupMemberView } from './chat/members'
import type { SetupInput, SetupStatus } from './identity'

export interface LanpmApi {
  platform: NodeJS.Platform | 'browser'
  versions: {
    node: string
    chrome: string
    electron: string
  }
  /** 本机设备名（Electron：os.hostname()；浏览器预览：占位） */
  getSuggestedDeviceName: () => string
  identity: {
    getSetupStatus: () => Promise<SetupStatus>
    completeSetup: (input: SetupInput) => Promise<SetupStatus>
  }
  chat: {
    listMessages: (groupId: string) => Promise<ChatMessage[]>
    sendText: (groupId: string, text: string) => Promise<ChatMessage>
    sendCode: (
      groupId: string,
      code: string,
      languageHint?: string,
      theme?: 'light' | 'dark'
    ) => Promise<ChatMessage>
    listMembers: (groupId: string) => Promise<GroupMemberView[]>
    onMessage: (handler: (message: ChatMessage) => void) => () => void
  }
}

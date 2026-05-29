import type { ChatMessage } from './chat/types'
import type { GroupMemberView } from './chat/members'
import type { SetupInput, SetupStatus } from './identity'
import type {
  CreateTaskInput,
  GanttScheduleInput,
  MoveTaskInput,
  Task,
  UpdateTaskInput
} from './task/types'
import type { TaskDependency, UpsertDependencyInput } from './task/dependency'
import type { CreateGroupInput, GroupRecord } from './group/types'
import type {
  AiConfigInput,
  AiConfigView,
  AiReportResult,
  CockpitDashboard
} from './cockpit/types'

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
    markRead: (groupId: string, msgIds: string[]) => Promise<void>
    pickAndSendFile: (groupId: string) => Promise<ChatMessage | null>
    sendFile: (groupId: string, filePath: string) => Promise<ChatMessage>
    onMessage: (handler: (message: ChatMessage) => void) => () => void
  }
  task: {
    listTasks: (groupId: string) => Promise<Task[]>
    createTask: (input: CreateTaskInput) => Promise<Task>
    updateTask: (input: UpdateTaskInput) => Promise<Task>
    moveTask: (input: MoveTaskInput) => Promise<Task>
    createFromChat: (
      groupId: string,
      title: string
    ) => Promise<{ task: Task; message: ChatMessage }>
    updateSchedule: (input: GanttScheduleInput) => Promise<Task>
    upsertDependency: (input: UpsertDependencyInput) => Promise<TaskDependency>
    removeDependency: (groupId: string, fromTaskId: string, toTaskId: string) => Promise<boolean>
    deleteTask: (taskId: string) => Promise<boolean>
    onTasksChanged: (handler: (groupId: string) => void) => () => void
  }
  search: {
    query: (query: string) => Promise<import('./search/types').GlobalSearchResult>
  }
  file: {
    listFiles: (groupId: string, category?: string) => Promise<import('./file/types').FileMeta[]>
    upload: (groupId: string, filePath?: string) => Promise<import('./file/types').FileMeta | null>
    getPreviewUrl: (fileId: string) => Promise<string | null>
    getPreviewText: (fileId: string) => Promise<string | null>
    listTransfers: (groupId: string) => Promise<import('./file/types').FileTransferView[]>
    addBookmark: (
      groupId: string,
      url: string,
      title: string
    ) => Promise<import('./file/types').FileMeta>
    importBookmarks: (groupId: string) => Promise<import('./file/types').FileMeta[]>
    exportBookmarks: (groupId: string) => Promise<string | null>
    onTransfersChanged: (handler: (groupId: string) => void) => () => void
  }
  group: {
    list: () => Promise<GroupRecord[]>
    create: (input: CreateGroupInput) => Promise<GroupRecord>
    enterAnonymous: (groupId: string) => Promise<void>
    leaveAnonymous: (groupId: string) => Promise<void>
    onListChanged: (handler: () => void) => () => void
  }
  cockpit: {
    getDashboard: () => Promise<CockpitDashboard>
    generateWeeklyReport: () => Promise<AiReportResult>
    generateMonthlyReport: () => Promise<AiReportResult>
    evaluateProjects: () => Promise<AiReportResult>
    getAiConfig: () => Promise<AiConfigView | null>
    saveAiConfig: (input: AiConfigInput) => Promise<AiConfigView>
  }
  network: {
    getStatus: () => Promise<import('./network/status').NetworkStatusView>
    reconnect: () => Promise<import('./network/status').NetworkStatusView>
    connectManualPeer: (address: string) => Promise<import('./network/status').NetworkStatusView>
  }
  badge: {
    getGroupTabBadges: (groupId: string) => Promise<import('./badge/types').GroupTabBadges>
  }
}

import type { DiscoverSnapshot } from './discover/types'
import type { ChatMessage } from './chat/types'
import type { ChatMessagePage } from './chat/pagination'
import type { GroupMemberView } from './chat/members'
import type { ProfileUpdateInput, SetupInput, SetupStatus } from './identity'
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
import type { DeleteTaskMode } from './task/deleteMode'
import type {
  BundleConflictMode,
  GroupBundleExportResult,
  GroupBundleImportResult,
  GroupBundlePreviewResult
} from './data/bundle'
import type {
  ClearGroupMessagesMode,
  DataCleanupOptions,
  DataCleanupResult,
  DataStorageSettingsView
} from './data/types'
import type { UserNotice } from './sync/userNotice'

export interface LanpmApi {
  platform: NodeJS.Platform | 'browser'
  versions: {
    node: string
    chrome: string
    electron: string
  }
  /** 本机设备名（Electron：os.hostname()；浏览器预览：占位） */
  getSuggestedDeviceName: () => string
  /** Main → renderer 轻提示（同步失败等） */
  onUserNotice: (handler: (notice: UserNotice) => void) => () => void
  /** 主进程桌面通知（Windows 品牌 icon / 标题） */
  notification: {
    show: (title: string, body: string) => Promise<void>
  }
  identity: {
    getSetupStatus: () => Promise<SetupStatus>
    completeSetup: (input: SetupInput) => Promise<SetupStatus>
    updateProfile: (input: ProfileUpdateInput) => Promise<SetupStatus>
    resetIdentity: () => Promise<SetupStatus>
  }
  chat: {
    listMessages: (groupId: string) => Promise<ChatMessagePage>
    loadOlderMessages: (groupId: string, beforeLamportTs: number) => Promise<ChatMessagePage>
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
    /** 引用已上传文件发送群聊消息（文件视图「发送到群聊」） */
    sendExistingFile: (groupId: string, fileId: string) => Promise<ChatMessage>
    /** 区域截图 + 标注，确认后作为图片文件发送到群聊（仅 Electron） */
    captureAndSendScreenshot: (groupId: string) => Promise<ChatMessage | null>
    recallMessage: (groupId: string, msgId: string) => Promise<ChatMessage>
    sendTaskRef: (groupId: string, taskId: string) => Promise<ChatMessage>
    /** 手动重试发送失败的本机消息 */
    retryMessage: (msgId: string) => Promise<ChatMessage>
    onMessage: (handler: (message: ChatMessage) => void) => () => void
  }
  task: {
    listTasks: (groupId: string) => Promise<Task[]>
    createTask: (input: CreateTaskInput) => Promise<Task>
    updateTask: (input: UpdateTaskInput) => Promise<Task>
    moveTask: (input: MoveTaskInput) => Promise<Task>
    createFromChat: (
      groupId: string,
      title: string,
      options?: { sourceMsgId?: string; linkedFileIds?: string[] }
    ) => Promise<{ task: Task; message: ChatMessage }>
    referenceFromChat: (
      groupId: string,
      taskId: string
    ) => Promise<{ task: Task; message: ChatMessage }>
    listDiscussions: (
      groupId: string,
      taskId: string
    ) => Promise<import('./task/discussions').TaskDiscussionItem[]>
    listChecklist: (
      groupId: string,
      taskId: string
    ) => Promise<import('./task/checklist').ChecklistView>
    upsertChecklistItem: (
      input: import('./task/checklist').UpsertChecklistItemInput
    ) => Promise<import('./task/checklist').ChecklistItem>
    toggleChecklistItem: (
      groupId: string,
      itemId: string,
      done?: boolean
    ) => Promise<import('./task/checklist').ChecklistItem>
    removeChecklistItem: (groupId: string, itemId: string) => Promise<boolean>
    createSubtaskFromChecklistItem: (
      groupId: string,
      itemId: string
    ) => Promise<{
      task: Task
      item: import('./task/checklist').ChecklistItem
    }>
    updateSchedule: (input: GanttScheduleInput) => Promise<Task>
    upsertDependency: (input: UpsertDependencyInput) => Promise<TaskDependency>
    removeDependency: (groupId: string, fromTaskId: string, toTaskId: string) => Promise<boolean>
    deleteTask: (taskId: string, mode?: DeleteTaskMode) => Promise<boolean>
    setAwareness: (
      groupId: string,
      state: import('./task/taskAwareness').TaskAwarenessLocalState | null
    ) => Promise<
      Array<import('./task/taskAwareness').TaskAwarenessLocalState & { clientId: number }>
    >
    listAwareness: (
      groupId: string
    ) => Promise<
      Array<import('./task/taskAwareness').TaskAwarenessLocalState & { clientId: number }>
    >
    listGroupTags: (groupId: string) => Promise<import('./task/groupTagMeta').GroupTagMeta[]>
    upsertGroupTag: (
      groupId: string,
      tagKey: string,
      color: string,
      label?: string
    ) => Promise<import('./task/groupTagMeta').GroupTagMeta>
    removeGroupTag: (groupId: string, tagKey: string) => Promise<boolean>
    importLocalTagColors: (
      groupId: string,
      overrides: Record<string, string>
    ) => Promise<number>
    onTasksChanged: (handler: (groupId: string) => void) => () => void
    onAwarenessChanged: (
      handler: (payload: {
        groupId: string
        peers: Array<
          import('./task/taskAwareness').TaskAwarenessLocalState & { clientId?: number }
        >
      }) => void
    ) => () => void
    onGroupTagsChanged: (handler: (groupId: string) => void) => () => void
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
    listTransferHistory: (groupId: string) => Promise<import('./file/types').FileTransferView[]>
    resumeTransfer: (transferId: string) => Promise<import('./file/types').FileTransferView>
    cancelTransfer: (transferId: string) => Promise<import('./file/types').FileTransferView>
    getTransferSettings: () => Promise<import('./file/settings').FileTransferSettingsView>
    setTransferRate: (rateKbps: number) => Promise<import('./file/settings').FileTransferSettingsView>
    addBookmark: (
      groupId: string,
      url: string,
      title: string
    ) => Promise<import('./file/types').FileMeta>
    importBookmarks: (groupId: string) => Promise<import('./file/types').FileMeta[]>
    exportBookmarks: (groupId: string) => Promise<string | null>
    pullRemote: (fileId: string) => Promise<import('./file/types').FileMeta>
    download: (fileId: string) => Promise<string | null>
    deleteLocal: (fileId: string) => Promise<boolean>
    onTransfersChanged: (handler: (groupId: string) => void) => () => void
  }
  data: {
    getStorageSettings: () => Promise<DataStorageSettingsView>
    getStorageUsage: () => Promise<{ messageCount: number; fileCount: number }>
    setLocalRetentionDays: (days: number) => Promise<number>
    runCleanup: (options: DataCleanupOptions) => Promise<DataCleanupResult>
    clearGroupMessages: (groupId: string, mode: ClearGroupMessagesMode) => Promise<number>
    listDmGroupIds: () => Promise<string[]>
    exportGroupBundle: (
      groupId: string,
      password: string,
      includeFileBodies?: boolean
    ) => Promise<(GroupBundleExportResult & { path: string }) | null>
    /** Pick file + dry-run conflict summary (TASK-310). */
    previewGroupBundle: (
      password: string
    ) => Promise<{ path: string; preview: GroupBundlePreviewResult } | null>
    /** Optional `filePath` skips the open dialog (after preview). */
    importGroupBundle: (
      password: string,
      conflictMode: BundleConflictMode,
      filePath?: string
    ) => Promise<GroupBundleImportResult | null>
  }
  group: {
    list: () => Promise<GroupRecord[]>
    /** groupId → 最后一条消息 ISO 时间 */
    listLastActivity: () => Promise<Record<string, string>>
    create: (input: CreateGroupInput) => Promise<GroupRecord>
    join: (groupId: string) => Promise<GroupRecord>
    enterAnonymous: (groupId: string) => Promise<void>
    leaveAnonymous: (groupId: string) => Promise<void>
    dissolve: (groupId: string) => Promise<void>
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
  ai: {
    listThreads: (
      input?: import('./ai/types').ListAiThreadsInput
    ) => Promise<import('./ai/types').AiThread[]>
    getThread: (
      threadId: string
    ) => Promise<{ thread: import('./ai/types').AiThread; messages: import('./ai/types').AiMessage[] }>
    createThread: (
      input?: import('./ai/types').CreateAiThreadInput
    ) => Promise<import('./ai/types').AiThread>
    deleteThread: (threadId: string) => Promise<{ ok: boolean }>
    getGateStatus: () => Promise<import('./ai/types').AiGateStatus>
    streamChat: (
      input: import('./ai/types').AiStreamChatInput
    ) => Promise<{ requestId: string }>
    reviewTask: (
      input: import('./ai/types').AiStructuredReviewInput
    ) => Promise<import('./ai/types').AiStructuredReviewResult>
    shareToChat: (
      input: import('./ai/types').AiShareToChatInput
    ) => Promise<ChatMessage>
    proposeSubtasks: (
      input: import('./ai/subtaskSchemas').AiProposeSubtasksInput
    ) => Promise<import('./ai/subtaskSchemas').AiProposeSubtasksResult>
    confirmSubtasks: (
      input: import('./ai/subtaskSchemas').AiConfirmSubtasksInput
    ) => Promise<import('./ai/subtaskSchemas').AiConfirmSubtasksResult>
    listPatrolRuns: (
      limit?: number
    ) => Promise<import('./ai/patrolTypes').AiPatrolRunSummary[]>
    getLatestPatrolRun: () => Promise<import('./ai/patrolTypes').AiPatrolReport | null>
    onStreamChunk: (
      handler: (payload: { requestId: string; delta: string }) => void
    ) => () => void
    onStreamDone: (
      handler: (payload: { requestId: string; threadId: string; assistantText: string }) => void
    ) => () => void
    onStreamError: (
      handler: (payload: { requestId: string; message: string }) => void
    ) => () => void
  }
  network: {
    getStatus: () => Promise<import('./network/status').NetworkStatusView>
    reconnect: () => Promise<import('./network/status').NetworkStatusView>
    connectManualPeer: (address: string) => Promise<import('./network/status').NetworkStatusView>
  }
  badge: {
    getGroupTabBadges: (groupId: string) => Promise<import('./badge/types').GroupTabBadges>
  }
  discover: {
    snapshot: () => Promise<DiscoverSnapshot>
    setSeeds: (seeds: string[]) => Promise<DiscoverSnapshot>
  }
  whiteboard: {
    getScene: (groupId: string) => Promise<import('./whiteboard/types').WhiteboardScene | null>
    saveScene: (
      input: import('./whiteboard/types').SaveWhiteboardSceneInput
    ) => Promise<import('./whiteboard/types').WhiteboardScene>
    exportPng: (
      input: import('./whiteboard/types').ExportWhiteboardPngInput
    ) => Promise<import('./file/types').FileMeta>
    getDocState: (groupId: string) => Promise<{
      groupId: string
      anonymous: boolean
      updateBase64: string
    }>
    publishUpdate: (groupId: string, updateBase64: string) => Promise<void>
    publishAwareness: (groupId: string, updateBase64: string) => Promise<void>
    onRemoteUpdate: (
      handler: (payload: { groupId: string; updateBase64: string }) => void
    ) => () => void
    onRemoteAwareness: (
      handler: (payload: { groupId: string; updateBase64: string }) => void
    ) => () => void
  }
  plugin: {
    listPlugins: () => Promise<import('./plugin/types').PluginView[]>
    listSlotPlugins: (
      slotId: import('./plugin/types').PluginSlotId
    ) => Promise<import('./plugin/types').PluginView[]>
    setEnabled: (
      pluginId: string,
      enabled: boolean
    ) => Promise<import('./plugin/types').PluginView[]>
    invokeCapability: (
      pluginId: string,
      capability: import('./plugin/types').PluginCapabilityId,
      args?: Record<string, unknown>
    ) => Promise<unknown>
  }
}

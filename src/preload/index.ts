import { contextBridge, ipcRenderer } from 'electron'
import type { DmMessagePreview } from '../shared/chat/dmPreview'
import type { ChatMessage } from '../shared/chat/types'
import type { ProfileUpdateInput, SetupInput } from '../shared/identity'
import type { LanpmApi } from '../shared/lanpm-api'
import { OPS_IPC } from '../shared/ops/channels'
import { CHAT_IPC, CHAT_PUSH_CHANNEL } from '../shared/chat/channels'
import { GROUP_TAG_META_PUSH_CHANNEL, TASK_AWARENESS_PUSH_CHANNEL, TASK_PUSH_CHANNEL } from '../shared/task/channels'
import { FILE_TRANSFER_PUSH_CHANNEL } from '../shared/file/channels'
import { GROUP_PUSH_CHANNEL, GROUP_JOIN_REQUEST_PUSH_CHANNEL } from '../shared/group/channels'
import { USER_NOTICE_CHANNEL } from '../shared/sync/userNotice'
import type { UserNotice } from '../shared/sync/userNotice'
import { LOCALE_IPC } from '../shared/locale/channels'
import {
  NOTIFICATION_IPC,
  NOTIFICATION_NAVIGATE_CHANNEL,
  type DesktopNotificationOptions,
  type NotificationNavigatePayload
} from '../shared/notification/channels'
import { AI_IPC, AI_STREAM_CHUNK_CHANNEL, AI_STREAM_DONE_CHANNEL, AI_STREAM_ERROR_CHANNEL } from '../shared/ai/channels'

const api: LanpmApi = {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  getSuggestedDeviceName: () =>
    ipcRenderer.sendSync('identity:getSuggestedDeviceNameSync') as string,
  onUserNotice: (handler: (notice: UserNotice) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, notice: UserNotice) => {
      handler(notice)
    }
    ipcRenderer.on(USER_NOTICE_CHANNEL, listener)
    return () => ipcRenderer.removeListener(USER_NOTICE_CHANNEL, listener)
  },
  notification: {
    show: (title: string, body: string, options?: DesktopNotificationOptions) =>
      ipcRenderer.invoke(NOTIFICATION_IPC.show, title, body, options),
    onNavigate: (handler: (payload: NotificationNavigatePayload) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, payload: NotificationNavigatePayload) => {
        handler(payload)
      }
      ipcRenderer.on(NOTIFICATION_NAVIGATE_CHANNEL, listener)
      return () => ipcRenderer.removeListener(NOTIFICATION_NAVIGATE_CHANNEL, listener)
    }
  },
  locale: {
    get: () => ipcRenderer.invoke(LOCALE_IPC.get) as Promise<'zh-CN' | 'en-US'>,
    set: (locale: 'zh-CN' | 'en-US') => ipcRenderer.invoke(LOCALE_IPC.set, locale)
  },
  identity: {
    getSetupStatus: () => ipcRenderer.invoke('identity:getStatus'),
    completeSetup: (input: SetupInput) => ipcRenderer.invoke('identity:completeSetup', input),
    updateProfile: (input: ProfileUpdateInput) =>
      ipcRenderer.invoke('identity:updateProfile', input),
    resetIdentity: () => ipcRenderer.invoke('identity:resetIdentity')
  },
  chat: {
    listMessages: (groupId) => ipcRenderer.invoke('chat:listMessages', groupId),
    listDmPreviews: () => ipcRenderer.invoke(CHAT_IPC.listDmPreviews) as Promise<DmMessagePreview[]>,
    loadOlderMessages: (groupId, beforeLamportTs) =>
      ipcRenderer.invoke('chat:loadOlderMessages', groupId, beforeLamportTs),
    sendText: (groupId, text, options) =>
      ipcRenderer.invoke('chat:sendText', groupId, text, options),
    sendCode: (groupId, code, languageHint, theme, options) =>
      ipcRenderer.invoke('chat:sendCode', groupId, code, languageHint, theme, options),
    listMembers: (groupId) => ipcRenderer.invoke('chat:listMembers', groupId),
    markRead: (groupId, msgIds) => ipcRenderer.invoke('chat:markRead', groupId, msgIds),
    pickAndSendFile: (groupId, options) =>
      ipcRenderer.invoke('chat:pickAndSendFile', groupId, options),
    sendFile: (groupId, filePath, options) =>
      ipcRenderer.invoke('chat:sendFile', groupId, filePath, options),
    sendExistingFile: (groupId, fileId, options) =>
      ipcRenderer.invoke('chat:sendExistingFile', groupId, fileId, options),
    captureAndSendScreenshot: (groupId) =>
      ipcRenderer.invoke('chat:captureAndSendScreenshot', groupId),
    sendVoice: (groupId, audioBase64, durationMs, mimeType) =>
      ipcRenderer.invoke('chat:sendVoice', groupId, audioBase64, durationMs, mimeType),
    recallMessage: (groupId, msgId) => ipcRenderer.invoke('chat:recallMessage', groupId, msgId),
    sendTaskRef: (groupId, taskId) => ipcRenderer.invoke('chat:sendTaskRef', groupId, taskId),
    retryMessage: (msgId) => ipcRenderer.invoke('chat:retryMessage', msgId),
    editMessage: (groupId, msgId, text) =>
      ipcRenderer.invoke('chat:editMessage', groupId, msgId, text),
    listPinnedIds: (groupId) => ipcRenderer.invoke('chat:listPinnedIds', groupId),
    togglePin: (groupId, msgId) => ipcRenderer.invoke('chat:togglePin', groupId, msgId),
    forwardMessage: (sourceMsgId, targetGroupId, senderDisplayName) =>
      ipcRenderer.invoke('chat:forwardMessage', sourceMsgId, targetGroupId, senderDisplayName),
    onMessage: (handler: (message: ChatMessage) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: ChatMessage) => {
        handler(message)
      }
      ipcRenderer.on(CHAT_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(CHAT_PUSH_CHANNEL, listener)
    }
  },
  task: {
    listTasks: (groupId) => ipcRenderer.invoke('task:listTasks', groupId),
    createTask: (input) => ipcRenderer.invoke('task:createTask', input),
    updateTask: (input) => ipcRenderer.invoke('task:updateTask', input),
    moveTask: (input) => ipcRenderer.invoke('task:moveTask', input),
    createFromChat: (groupId, title, options) =>
      ipcRenderer.invoke('task:createFromChat', groupId, title, options),
    referenceFromChat: (groupId, taskId) =>
      ipcRenderer.invoke('task:referenceFromChat', groupId, taskId),
    listDiscussions: (groupId, taskId) =>
      ipcRenderer.invoke('task:listDiscussions', groupId, taskId),
    listChecklist: (groupId, taskId) =>
      ipcRenderer.invoke('task:listChecklist', groupId, taskId),
    upsertChecklistItem: (input) => ipcRenderer.invoke('task:upsertChecklistItem', input),
    toggleChecklistItem: (groupId, itemId, done) =>
      ipcRenderer.invoke('task:toggleChecklistItem', groupId, itemId, done),
    removeChecklistItem: (groupId, itemId) =>
      ipcRenderer.invoke('task:removeChecklistItem', groupId, itemId),
    createSubtaskFromChecklistItem: (groupId, itemId) =>
      ipcRenderer.invoke('task:createSubtaskFromChecklistItem', groupId, itemId),
    updateSchedule: (input) => ipcRenderer.invoke('task:updateSchedule', input),
    freezeScheduleBaseline: (groupId) =>
      ipcRenderer.invoke('task:freezeScheduleBaseline', groupId),
    getScheduleBaseline: (groupId) => ipcRenderer.invoke('task:getScheduleBaseline', groupId),
    getAgileBurndown: (groupId) => ipcRenderer.invoke('task:getAgileBurndown', groupId),
    getAgileWipLimits: (groupId) => ipcRenderer.invoke('task:getAgileWipLimits', groupId),
    setAgileWipLimit: (groupId, status, limit) =>
      ipcRenderer.invoke('task:setAgileWipLimit', groupId, status, limit),
    upsertDependency: (input) => ipcRenderer.invoke('task:upsertDependency', input),
    removeDependency: (groupId, fromTaskId, toTaskId) =>
      ipcRenderer.invoke('task:removeDependency', groupId, fromTaskId, toTaskId),
    deleteTask: (taskId, mode) => ipcRenderer.invoke('task:deleteTask', taskId, mode),
    setAwareness: (groupId, state) => ipcRenderer.invoke('task:setAwareness', groupId, state),
    listAwareness: (groupId) => ipcRenderer.invoke('task:listAwareness', groupId),
    listGroupTags: (groupId) => ipcRenderer.invoke('task:listGroupTags', groupId),
    upsertGroupTag: (groupId, tagKey, color, label) =>
      ipcRenderer.invoke('task:upsertGroupTag', groupId, tagKey, color, label),
    removeGroupTag: (groupId, tagKey) =>
      ipcRenderer.invoke('task:removeGroupTag', groupId, tagKey),
    importLocalTagColors: (groupId, overrides) =>
      ipcRenderer.invoke('task:importLocalTagColors', groupId, overrides),
    onTasksChanged: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, groupId: string) => {
        handler(groupId)
      }
      ipcRenderer.on(TASK_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(TASK_PUSH_CHANNEL, listener)
    },
    onAwarenessChanged: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { groupId: string; peers: import('../shared/task/taskAwareness').TaskAwarenessLocalState[] }
      ) => {
        handler(payload)
      }
      ipcRenderer.on(TASK_AWARENESS_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(TASK_AWARENESS_PUSH_CHANNEL, listener)
    },
    onGroupTagsChanged: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, groupId: string) => {
        handler(groupId)
      }
      ipcRenderer.on(GROUP_TAG_META_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(GROUP_TAG_META_PUSH_CHANNEL, listener)
    }
  },
  file: {
    listFiles: (groupId, category) => ipcRenderer.invoke('file:list', groupId, category),
    upload: (groupId) => ipcRenderer.invoke('file:upload', groupId),
    getPreviewUrl: (fileId) => ipcRenderer.invoke('file:getPreviewUrl', fileId),
    getPreviewText: (fileId) => ipcRenderer.invoke('file:getPreviewText', fileId),
    listTransfers: (groupId) => ipcRenderer.invoke('file:listTransfers', groupId),
    listTransferHistory: (groupId) => ipcRenderer.invoke('file:listTransferHistory', groupId),
    resumeTransfer: (transferId) => ipcRenderer.invoke('file:resumeTransfer', transferId),
    cancelTransfer: (transferId) => ipcRenderer.invoke('file:cancelTransfer', transferId),
    getTransferSettings: () => ipcRenderer.invoke('file:getTransferSettings'),
    setTransferRate: (rateKbps) => ipcRenderer.invoke('file:setTransferRate', rateKbps),
    addBookmark: (groupId, url, title) =>
      ipcRenderer.invoke('file:addBookmark', groupId, url, title),
    importBookmarks: (groupId) => ipcRenderer.invoke('file:importBookmarks', groupId),
    exportBookmarks: (groupId) => ipcRenderer.invoke('file:exportBookmarks', groupId),
    pullRemote: (fileId) => ipcRenderer.invoke('file:pullRemote', fileId),
    download: (fileId) => ipcRenderer.invoke('file:download', fileId),
    deleteLocal: (fileId) => ipcRenderer.invoke('file:deleteLocal', fileId),
    onTransfersChanged: (handler) => {
      const listener = (_event: Electron.IpcRendererEvent, groupId: string) => {
        handler(groupId)
      }
      ipcRenderer.on(FILE_TRANSFER_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(FILE_TRANSFER_PUSH_CHANNEL, listener)
    }
  },
  group: {
    list: () => ipcRenderer.invoke('group:list'),
    listLastActivity: () => ipcRenderer.invoke('group:listLastActivity'),
    create: (input) => ipcRenderer.invoke('group:create', input),
    join: (groupId) => ipcRenderer.invoke('group:join', groupId),
    listJoinRequests: () => ipcRenderer.invoke('group:listJoinRequests'),
    approveJoinRequest: (requestId) => ipcRenderer.invoke('group:approveJoinRequest', requestId),
    rejectJoinRequest: (requestId) => ipcRenderer.invoke('group:rejectJoinRequest', requestId),
    startInvite: (groupId) => ipcRenderer.invoke('group:startInvite', groupId),
    cancelInvite: (groupId) => ipcRenderer.invoke('group:cancelInvite', groupId),
    joinWithInvite: (input) => ipcRenderer.invoke('group:joinWithInvite', input),
    enterAnonymous: (groupId) => ipcRenderer.invoke('group:enterAnonymous', groupId),
    leaveAnonymous: (groupId) => ipcRenderer.invoke('group:leaveAnonymous', groupId),
    dissolve: (groupId) => ipcRenderer.invoke('group:dissolve', groupId),
    onListChanged: (handler) => {
      const listener = () => handler()
      ipcRenderer.on(GROUP_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(GROUP_PUSH_CHANNEL, listener)
    },
    onJoinRequestsChanged: (handler) => {
      const listener = () => handler()
      ipcRenderer.on(GROUP_JOIN_REQUEST_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(GROUP_JOIN_REQUEST_PUSH_CHANNEL, listener)
    }
  },
  cockpit: {
    getDashboard: () => ipcRenderer.invoke('cockpit:getDashboard'),
    generateWeeklyReport: () => ipcRenderer.invoke('cockpit:generateWeeklyReport'),
    generateMonthlyReport: () => ipcRenderer.invoke('cockpit:generateMonthlyReport'),
    evaluateProjects: () => ipcRenderer.invoke('cockpit:evaluateProjects'),
    getAiConfig: () => ipcRenderer.invoke('cockpit:getAiConfig'),
    saveAiConfig: (input) => ipcRenderer.invoke('cockpit:saveAiConfig', input)
  },
  ai: {
    listThreads: (input) => ipcRenderer.invoke(AI_IPC.listThreads, input),
    getThread: (threadId) => ipcRenderer.invoke(AI_IPC.getThread, threadId),
    createThread: (input) => ipcRenderer.invoke(AI_IPC.createThread, input),
    deleteThread: (threadId) => ipcRenderer.invoke(AI_IPC.deleteThread, threadId),
    getGateStatus: () => ipcRenderer.invoke(AI_IPC.getGateStatus),
    probeEndpoint: (input) => ipcRenderer.invoke(AI_IPC.probeEndpoint, input),
    streamChat: (input) => ipcRenderer.invoke(AI_IPC.streamChat, input),
    reviewTask: (input) => ipcRenderer.invoke(AI_IPC.reviewTask, input),
    shareToChat: (input) => ipcRenderer.invoke(AI_IPC.shareToChat, input),
    proposeSubtasks: (input) => ipcRenderer.invoke(AI_IPC.proposeSubtasks, input),
    confirmSubtasks: (input) => ipcRenderer.invoke(AI_IPC.confirmSubtasks, input),
    listPatrolRuns: (limit) => ipcRenderer.invoke(AI_IPC.listPatrolRuns, limit),
    getLatestPatrolRun: () => ipcRenderer.invoke(AI_IPC.getLatestPatrolRun),
    startPipeline: (input) => ipcRenderer.invoke(AI_IPC.startPipeline, input),
    resumePipeline: (input) => ipcRenderer.invoke(AI_IPC.resumePipeline, input),
    cancelPipeline: (input) => ipcRenderer.invoke(AI_IPC.cancelPipeline, input),
    getPipelineRun: (runId) => ipcRenderer.invoke(AI_IPC.getPipelineRun, runId),
    listPipelineRuns: (limit) => ipcRenderer.invoke(AI_IPC.listPipelineRuns, limit),
    onStreamChunk: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { requestId: string; delta: string }
      ) => handler(payload)
      ipcRenderer.on(AI_STREAM_CHUNK_CHANNEL, listener)
      return () => ipcRenderer.removeListener(AI_STREAM_CHUNK_CHANNEL, listener)
    },
    onStreamDone: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { requestId: string; threadId: string; assistantText: string }
      ) => handler(payload)
      ipcRenderer.on(AI_STREAM_DONE_CHANNEL, listener)
      return () => ipcRenderer.removeListener(AI_STREAM_DONE_CHANNEL, listener)
    },
    onStreamError: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { requestId: string; message: string }
      ) => handler(payload)
      ipcRenderer.on(AI_STREAM_ERROR_CHANNEL, listener)
      return () => ipcRenderer.removeListener(AI_STREAM_ERROR_CHANNEL, listener)
    }
  },
  search: {
    query: (query) => ipcRenderer.invoke('search:query', query)
  },
  network: {
    getStatus: () => ipcRenderer.invoke('network:getStatus'),
    reconnect: () => ipcRenderer.invoke('network:reconnect'),
    connectManualPeer: (address) => ipcRenderer.invoke('network:connectManualPeer', address)
  },
  badge: {
    getGroupTabBadges: (groupId) => ipcRenderer.invoke('badge:getGroupTabBadges', groupId)
  },
  discover: {
    snapshot: () => ipcRenderer.invoke('discover:snapshot'),
    setSeeds: (seeds) => ipcRenderer.invoke('discover:setSeeds', seeds)
  },
  ops: {
    sendSlash: (groupId, text, options) =>
      ipcRenderer.invoke(OPS_IPC.sendSlash, groupId, text, options),
    listMachines: (groupId) => ipcRenderer.invoke(OPS_IPC.listMachines, groupId),
    listAudit: (groupId, limit) => ipcRenderer.invoke(OPS_IPC.listAudit, groupId, limit),
    getGroupSettings: (groupId) => ipcRenderer.invoke(OPS_IPC.getGroupSettings, groupId),
    updateGroupSettings: (groupId, patch) =>
      ipcRenderer.invoke(OPS_IPC.updateGroupSettings, groupId, patch),
    getGatewayStatus: () => ipcRenderer.invoke(OPS_IPC.getGatewayStatus),
    startGateway: () => ipcRenderer.invoke(OPS_IPC.startGateway),
    stopGateway: () => ipcRenderer.invoke(OPS_IPC.stopGateway),
    updateGatewayConfig: (patch) => ipcRenderer.invoke(OPS_IPC.updateGatewayConfig, patch),
    rotateGatewayToken: () => ipcRenderer.invoke(OPS_IPC.rotateGatewayToken)
  },
  pairing: {
    start: () => ipcRenderer.invoke('pairing:start'),
    cancel: () => ipcRenderer.invoke('pairing:cancel'),
    join: (input) => ipcRenderer.invoke('pairing:join', input),
    exportPeerFileDialog: () => ipcRenderer.invoke('pairing:exportPeerFileDialog'),
    importPeerFileDialog: () => ipcRenderer.invoke('pairing:importPeerFileDialog')
  },
  whiteboard: {
    getScene: (groupId) => ipcRenderer.invoke('whiteboard:getScene', groupId),
    saveScene: (input) => ipcRenderer.invoke('whiteboard:saveScene', input),
    exportPng: (input) => ipcRenderer.invoke('whiteboard:exportPng', input),
    getDocState: (groupId) => ipcRenderer.invoke('whiteboard:getDocState', groupId),
    publishUpdate: (groupId, updateBase64) =>
      ipcRenderer.invoke('whiteboard:publishUpdate', { groupId, updateBase64 }),
    publishAwareness: (groupId, updateBase64) =>
      ipcRenderer.invoke('whiteboard:publishAwareness', { groupId, updateBase64 }),
    onRemoteUpdate: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { groupId: string; updateBase64: string }
      ) => {
        handler(payload)
      }
      ipcRenderer.on('whiteboard:remoteUpdate', listener)
      return () => ipcRenderer.removeListener('whiteboard:remoteUpdate', listener)
    },
    onRemoteAwareness: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { groupId: string; updateBase64: string }
      ) => {
        handler(payload)
      }
      ipcRenderer.on('whiteboard:remoteAwareness', listener)
      return () => ipcRenderer.removeListener('whiteboard:remoteAwareness', listener)
    }
  },
  mindmap: {
    list: (groupId) => ipcRenderer.invoke('mindmap:list', groupId),
    create: (input) => ipcRenderer.invoke('mindmap:create', input),
    load: (docId) => ipcRenderer.invoke('mindmap:load', docId),
    save: (input) => ipcRenderer.invoke('mindmap:save', input),
    rename: (input) => ipcRenderer.invoke('mindmap:rename', input),
    delete: (docId) => ipcRenderer.invoke('mindmap:delete', docId),
    exportPng: (input) => ipcRenderer.invoke('mindmap:exportPng', input),
    getDocState: (docId) => ipcRenderer.invoke('mindmap:getDocState', docId),
    publishUpdate: (docId, updateBase64) =>
      ipcRenderer.invoke('mindmap:publishUpdate', { docId, updateBase64 }),
    publishAwareness: (docId, updateBase64) =>
      ipcRenderer.invoke('mindmap:publishAwareness', { docId, updateBase64 }),
    onRemoteUpdate: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { groupId: string; docId: string; updateBase64: string }
      ) => {
        handler(payload)
      }
      ipcRenderer.on('mindmap:remoteUpdate', listener)
      return () => ipcRenderer.removeListener('mindmap:remoteUpdate', listener)
    },
    onRemoteAwareness: (handler) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { groupId: string; docId: string; updateBase64: string }
      ) => {
        handler(payload)
      }
      ipcRenderer.on('mindmap:remoteAwareness', listener)
      return () => ipcRenderer.removeListener('mindmap:remoteAwareness', listener)
    }
  },
  plugin: {
    listPlugins: () => ipcRenderer.invoke('plugin:listPlugins'),
    listSlotPlugins: (slotId) => ipcRenderer.invoke('plugin:listSlotPlugins', slotId),
    listContributedViews: () => ipcRenderer.invoke('plugin:listContributedViews'),
    listCommands: () => ipcRenderer.invoke('plugin:listCommands'),
    listMenus: (location?: string) => ipcRenderer.invoke('plugin:listMenus', location),
    invokeCommand: (commandId) => ipcRenderer.invoke('plugin:invokeCommand', commandId),
    importLicense: (payload) => ipcRenderer.invoke('plugin:importLicense', payload),
    getLicenseStatus: (pluginId) => ipcRenderer.invoke('plugin:getLicenseStatus', pluginId),
    setEnabled: (pluginId, enabled) =>
      ipcRenderer.invoke('plugin:setEnabled', pluginId, enabled),
    invokeCapability: (pluginId, capability, args) =>
      ipcRenderer.invoke('plugin:invokeCapability', pluginId, capability, args),
    confirmCapability: (pluginId, pendingId) =>
      ipcRenderer.invoke('plugin:confirmCapability', pluginId, pendingId)
  },
  nav: {
    getDocument: () => ipcRenderer.invoke('nav:getDocument'),
    getPreferences: () => ipcRenderer.invoke('nav:getPreferences'),
    setPreferences: (prefs) => ipcRenderer.invoke('nav:setPreferences', prefs),
    getGroupPreferences: (groupId) => ipcRenderer.invoke('nav:getGroupPreferences', groupId),
    setGroupPreferences: (groupId, prefs) =>
      ipcRenderer.invoke('nav:setGroupPreferences', groupId, prefs),
    clearGroupOverride: (groupId) => ipcRenderer.invoke('nav:clearGroupOverride', groupId)
  },
  meeting: {
    getLiveKitConfig: () => ipcRenderer.invoke('meeting:getLiveKitConfig'),
    setLiveKitConfig: (input) => ipcRenderer.invoke('meeting:setLiveKitConfig', input),
    saveRecording: (payload) => ipcRenderer.invoke('meeting:saveRecording', payload),
    listSchedules: (groupId) => ipcRenderer.invoke('meeting:listSchedules', groupId),
    createSchedule: (input) => ipcRenderer.invoke('meeting:createSchedule', input),
    updateSchedule: (input) => ipcRenderer.invoke('meeting:updateSchedule', input),
    deleteSchedule: (payload) => ipcRenderer.invoke('meeting:deleteSchedule', payload)
  },
  data: {
    getStorageSettings: () => ipcRenderer.invoke('data:getStorageSettings'),
    getStorageUsage: () => ipcRenderer.invoke('data:getStorageUsage'),
    setLocalRetentionDays: (days) => ipcRenderer.invoke('data:setLocalRetentionDays', days),
    runCleanup: (options) => ipcRenderer.invoke('data:runCleanup', options),
    clearGroupMessages: (groupId, mode) =>
      ipcRenderer.invoke('data:clearGroupMessages', groupId, mode),
    listDmGroupIds: () => ipcRenderer.invoke('data:listDmGroupIds'),
    exportGroupBundle: (groupId, password, includeFileBodies) =>
      ipcRenderer.invoke('data:exportGroupBundle', groupId, password, includeFileBodies),
    previewGroupBundle: (password) => ipcRenderer.invoke('data:previewGroupBundle', password),
    importGroupBundle: (password, conflictMode, filePath) =>
      ipcRenderer.invoke('data:importGroupBundle', password, conflictMode, filePath),
    getAtRestStatus: () => ipcRenderer.invoke('data:getAtRestStatus'),
    encryptAtRest: (passphrase) => ipcRenderer.invoke('data:encryptAtRest', passphrase)
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

export type { LanpmApi }

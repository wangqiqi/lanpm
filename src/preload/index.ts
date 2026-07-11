import { contextBridge, ipcRenderer } from 'electron'
import type { ChatMessage } from '../shared/chat/types'
import type { ProfileUpdateInput, SetupInput } from '../shared/identity'
import type { LanpmApi } from '../shared/lanpm-api'
import { CHAT_PUSH_CHANNEL } from '../shared/chat/channels'
import { GROUP_TAG_META_PUSH_CHANNEL, TASK_AWARENESS_PUSH_CHANNEL, TASK_PUSH_CHANNEL } from '../shared/task/channels'
import { FILE_TRANSFER_PUSH_CHANNEL } from '../shared/file/channels'
import { GROUP_PUSH_CHANNEL } from '../shared/group/channels'
import { USER_NOTICE_CHANNEL } from '../shared/sync/userNotice'
import type { UserNotice } from '../shared/sync/userNotice'

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
  identity: {
    getSetupStatus: () => ipcRenderer.invoke('identity:getStatus'),
    completeSetup: (input: SetupInput) => ipcRenderer.invoke('identity:completeSetup', input),
    updateProfile: (input: ProfileUpdateInput) =>
      ipcRenderer.invoke('identity:updateProfile', input),
    resetIdentity: () => ipcRenderer.invoke('identity:resetIdentity')
  },
  chat: {
    listMessages: (groupId) => ipcRenderer.invoke('chat:listMessages', groupId),
    loadOlderMessages: (groupId, beforeLamportTs) =>
      ipcRenderer.invoke('chat:loadOlderMessages', groupId, beforeLamportTs),
    sendText: (groupId, text) => ipcRenderer.invoke('chat:sendText', groupId, text),
    sendCode: (groupId, code, languageHint, theme) =>
      ipcRenderer.invoke('chat:sendCode', groupId, code, languageHint, theme),
    listMembers: (groupId) => ipcRenderer.invoke('chat:listMembers', groupId),
    markRead: (groupId, msgIds) => ipcRenderer.invoke('chat:markRead', groupId, msgIds),
    pickAndSendFile: (groupId) => ipcRenderer.invoke('chat:pickAndSendFile', groupId),
    sendFile: (groupId, filePath) => ipcRenderer.invoke('chat:sendFile', groupId, filePath),
    sendExistingFile: (groupId, fileId) =>
      ipcRenderer.invoke('chat:sendExistingFile', groupId, fileId),
    captureAndSendScreenshot: (groupId) =>
      ipcRenderer.invoke('chat:captureAndSendScreenshot', groupId),
    recallMessage: (groupId, msgId) => ipcRenderer.invoke('chat:recallMessage', groupId, msgId),
    sendTaskRef: (groupId, taskId) => ipcRenderer.invoke('chat:sendTaskRef', groupId, taskId),
    retryMessage: (msgId) => ipcRenderer.invoke('chat:retryMessage', msgId),
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
    updateSchedule: (input) => ipcRenderer.invoke('task:updateSchedule', input),
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
    upload: (groupId, filePath) => ipcRenderer.invoke('file:upload', groupId, filePath),
    getPreviewUrl: (fileId) => ipcRenderer.invoke('file:getPreviewUrl', fileId),
    getPreviewText: (fileId) => ipcRenderer.invoke('file:getPreviewText', fileId),
    listTransfers: (groupId) => ipcRenderer.invoke('file:listTransfers', groupId),
    listTransferHistory: (groupId) => ipcRenderer.invoke('file:listTransferHistory', groupId),
    resumeTransfer: (transferId) => ipcRenderer.invoke('file:resumeTransfer', transferId),
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
    enterAnonymous: (groupId) => ipcRenderer.invoke('group:enterAnonymous', groupId),
    leaveAnonymous: (groupId) => ipcRenderer.invoke('group:leaveAnonymous', groupId),
    dissolve: (groupId) => ipcRenderer.invoke('group:dissolve', groupId),
    onListChanged: (handler) => {
      const listener = () => handler()
      ipcRenderer.on(GROUP_PUSH_CHANNEL, listener)
      return () => ipcRenderer.removeListener(GROUP_PUSH_CHANNEL, listener)
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
    snapshot: () => ipcRenderer.invoke('discover:snapshot')
  },
  whiteboard: {
    getScene: (groupId) => ipcRenderer.invoke('whiteboard:getScene', groupId),
    saveScene: (input) => ipcRenderer.invoke('whiteboard:saveScene', input),
    exportPng: (input) => ipcRenderer.invoke('whiteboard:exportPng', input)
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
    importGroupBundle: (password, conflictMode) =>
      ipcRenderer.invoke('data:importGroupBundle', password, conflictMode)
  }
}

contextBridge.exposeInMainWorld('lanpm', api)

export type { LanpmApi }

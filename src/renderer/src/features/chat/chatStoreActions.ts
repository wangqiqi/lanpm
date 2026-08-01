import { useChatStore } from '@renderer/stores/chatStore'
import { useTaskStore } from '@renderer/stores/taskStore'
import { useChatMembersStore } from '@renderer/stores/chatMembersStore'
import { useChatPinStore } from '@renderer/stores/chatPinStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'

/**
 * Stable store action accessors for chat surfaces.
 * Use in handlers/effects — do not subscribe via `useChatStore((s) => s.sendText)`.
 */
export const chatStoreActions = {
  loadMessages: (groupId: string) => useChatStore.getState().loadMessages(groupId),
  loadOlderMessages: (groupId: string) => useChatStore.getState().loadOlderMessages(groupId),
  sendText: (...args: Parameters<ReturnType<typeof useChatStore.getState>['sendText']>) =>
    useChatStore.getState().sendText(...args),
  sendCode: (...args: Parameters<ReturnType<typeof useChatStore.getState>['sendCode']>) =>
    useChatStore.getState().sendCode(...args),
  editMessage: (...args: Parameters<ReturnType<typeof useChatStore.getState>['editMessage']>) =>
    useChatStore.getState().editMessage(...args),
  forwardMessage: (
    ...args: Parameters<ReturnType<typeof useChatStore.getState>['forwardMessage']>
  ) => useChatStore.getState().forwardMessage(...args),
  pickAndSendFile: (
    ...args: Parameters<ReturnType<typeof useChatStore.getState>['pickAndSendFile']>
  ) => useChatStore.getState().pickAndSendFile(...args),
  sendFile: (...args: Parameters<ReturnType<typeof useChatStore.getState>['sendFile']>) =>
    useChatStore.getState().sendFile(...args),
  captureAndSendScreenshot: (groupId: string) =>
    useChatStore.getState().captureAndSendScreenshot(groupId),
  upsertMessage: (...args: Parameters<ReturnType<typeof useChatStore.getState>['upsertMessage']>) =>
    useChatStore.getState().upsertMessage(...args),
  recallMessage: (...args: Parameters<ReturnType<typeof useChatStore.getState>['recallMessage']>) =>
    useChatStore.getState().recallMessage(...args),
  retryMessage: (msgId: string) => useChatStore.getState().retryMessage(msgId),
  sendTaskRef: (...args: Parameters<ReturnType<typeof useChatStore.getState>['sendTaskRef']>) =>
    useChatStore.getState().sendTaskRef(...args),
  downgradeInactiveGroups: (activeGroupId: string) =>
    useChatStore.getState().downgradeInactiveGroups(activeGroupId),
  loadMembers: (groupId: string) => useChatMembersStore.getState().loadMembers(groupId),
  loadPins: (groupId: string) => useChatPinStore.getState().loadPins(groupId),
  togglePin: (...args: Parameters<ReturnType<typeof useChatPinStore.getState>['togglePin']>) =>
    useChatPinStore.getState().togglePin(...args),
  loadTasks: (groupId: string) => useTaskStore.getState().loadTasks(groupId),
  createFromChat: (...args: Parameters<ReturnType<typeof useTaskStore.getState>['createFromChat']>) =>
    useTaskStore.getState().createFromChat(...args),
  updateTask: (...args: Parameters<ReturnType<typeof useTaskStore.getState>['updateTask']>) =>
    useTaskStore.getState().updateTask(...args),
  openDmSession: (...args: Parameters<ReturnType<typeof useDmStore.getState>['openSession']>) =>
    useDmStore.getState().openSession(...args),
  getGroupType: (groupId: string) => useNavigationStore.getState().getGroupType(groupId),
  pruneDmDisallowedOrigins: () =>
    useDmStore.getState().pruneDisallowedOrigins(useNavigationStore.getState().getGroupType),
  syncDmWithDatabase: (localUserId: string) =>
    useDmStore.getState().syncWithDatabase(localUserId)
}

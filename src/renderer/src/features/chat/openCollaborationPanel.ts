import {
  useChatCollaborationStore,
  type ChatCollaborationOpenOptions,
  type ChatCollaborationPanel
} from '@renderer/stores/chatCollaborationStore'

/** 聊天协作 IA：统一从任意视图打开文件库 / 白板 / 脑图抽屉 */
export function openCollaborationPanel(
  panel: ChatCollaborationPanel,
  options?: ChatCollaborationOpenOptions
): void {
  useChatCollaborationStore.getState().open(panel, options)
}

export function openFilesCollaborationPanel(selectFileId?: string): void {
  openCollaborationPanel('files', selectFileId ? { selectFileId } : undefined)
}

export function openWhiteboardCollaborationPanel(linkTaskId?: string): void {
  openCollaborationPanel('whiteboard', linkTaskId ? { linkTaskId } : undefined)
}

export function openMindmapCollaborationPanel(): void {
  openCollaborationPanel('mindmap')
}

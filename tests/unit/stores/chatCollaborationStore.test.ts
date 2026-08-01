import { describe, expect, it, beforeEach } from 'vitest'
import { useChatCollaborationStore } from '@renderer/stores/chatCollaborationStore'

describe('chatCollaborationStore', () => {
  beforeEach(() => {
    useChatCollaborationStore.setState({
      panel: null,
      pendingSelectFileId: null,
      pendingLinkTaskId: null
    })
  })

  it('open files with selectFileId sets pending selection', () => {
    useChatCollaborationStore.getState().open('files', { selectFileId: 'file-1' })
    const state = useChatCollaborationStore.getState()
    expect(state.panel).toBe('files')
    expect(state.pendingSelectFileId).toBe('file-1')
    expect(state.pendingLinkTaskId).toBeNull()
  })

  it('open whiteboard with linkTaskId sets pending task link', () => {
    useChatCollaborationStore.getState().open('whiteboard', { linkTaskId: 'task-1' })
    const state = useChatCollaborationStore.getState()
    expect(state.panel).toBe('whiteboard')
    expect(state.pendingLinkTaskId).toBe('task-1')
    expect(state.pendingSelectFileId).toBeNull()
  })

  it('open non-files panel clears pending file selection', () => {
    useChatCollaborationStore.getState().open('files', { selectFileId: 'file-1' })
    useChatCollaborationStore.getState().open('whiteboard')
    expect(useChatCollaborationStore.getState().pendingSelectFileId).toBeNull()
  })

  it('open non-whiteboard panel clears pending task link', () => {
    useChatCollaborationStore.getState().open('whiteboard', { linkTaskId: 'task-1' })
    useChatCollaborationStore.getState().open('files')
    expect(useChatCollaborationStore.getState().pendingLinkTaskId).toBeNull()
  })

  it('close clears panel and pending state', () => {
    useChatCollaborationStore.getState().open('files', { selectFileId: 'file-1' })
    useChatCollaborationStore.getState().open('whiteboard', { linkTaskId: 'task-1' })
    useChatCollaborationStore.getState().close()
    const state = useChatCollaborationStore.getState()
    expect(state.panel).toBeNull()
    expect(state.pendingSelectFileId).toBeNull()
    expect(state.pendingLinkTaskId).toBeNull()
  })
})

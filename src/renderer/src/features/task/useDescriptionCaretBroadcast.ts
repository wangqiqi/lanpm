/**
 * Broadcast description caret via task_awareness (TASK-197/199).
 */
import { useCallback } from 'react'
import type { TaskAwarenessView } from '@shared/task/taskAwareness'
import { publishLocalAwareness } from '@renderer/stores/taskAwarenessStore'
import { useIdentityStore } from '@renderer/stores/identityStore'

export function useDescriptionCaretBroadcast(
  groupId: string,
  taskId: string | null | undefined,
  view: Exclude<TaskAwarenessView, null>
): {
  publishCaret: (offset: number | null) => void
  clearCaret: () => void
} {
  const identityUser = useIdentityStore((s) => s.user)

  const publishCaret = useCallback(
    (offset: number | null) => {
      if (!groupId || !taskId || !identityUser) return
      void publishLocalAwareness(groupId, {
        userId: identityUser.userId,
        displayName: identityUser.displayName,
        focusedTaskId: taskId,
        view,
        caret:
          offset === null
            ? null
            : { field: 'description', offset: Math.max(0, Math.floor(offset)) }
      })
    },
    [groupId, taskId, identityUser, view]
  )

  const clearCaret = useCallback(() => {
    publishCaret(null)
  }, [publishCaret])

  return { publishCaret, clearCaret }
}

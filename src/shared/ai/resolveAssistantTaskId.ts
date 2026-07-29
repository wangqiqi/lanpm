import { splitTaskRefSegments } from '../chat/taskRefs.ts'
import type { Task } from '../task/types.ts'

/** Resolve a single parent task for assistant subtask split. */
export function resolveAssistantTaskId(
  contextTaskId: string | null | undefined,
  composerText: string,
  tasks: Task[]
): string | null {
  const ids = new Set<string>()
  if (contextTaskId) ids.add(contextTaskId)
  for (const seg of splitTaskRefSegments(composerText, tasks)) {
    if (seg.kind === 'taskRef' && seg.taskId) ids.add(seg.taskId)
  }
  if (ids.size === 1) return [...ids][0]!
  return null
}

/** Group whiteboard route helpers (shared · no renderer imports). */

export function whiteboardPathForTask(groupId: string, taskId?: string): string {
  const base = `/g/${groupId}/whiteboard`
  if (!taskId) return base
  return `${base}?linkTask=${encodeURIComponent(taskId)}`
}

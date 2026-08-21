export type ScheduleCriticalPathEvent = {
  groupId: string
  active: boolean
  taskIds: string[]
}

const EVENT = 'lanpm-schedule-critical-path'

export function publishScheduleCriticalPath(detail: ScheduleCriticalPathEvent): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}

export function subscribeScheduleCriticalPath(
  listener: (detail: ScheduleCriticalPathEvent) => void
): () => void {
  const onEvent = (ev: Event): void => {
    listener((ev as CustomEvent<ScheduleCriticalPathEvent>).detail)
  }
  window.addEventListener(EVENT, onEvent)
  return () => window.removeEventListener(EVENT, onEvent)
}

export type ScheduleOverlapEvent = {
  groupId: string
  taskIds: string[]
}

const EVENT = 'lanpm-schedule-assignee-overlap'

export function publishScheduleOverlap(detail: ScheduleOverlapEvent): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}

export function subscribeScheduleOverlap(
  listener: (detail: ScheduleOverlapEvent) => void
): () => void {
  const onEvent = (ev: Event): void => {
    listener((ev as CustomEvent<ScheduleOverlapEvent>).detail)
  }
  window.addEventListener(EVENT, onEvent)
  return () => window.removeEventListener(EVENT, onEvent)
}

import type { ScheduleBaselineSnapshot } from '@shared/task/scheduleBaseline'

export type ScheduleBaselineEvent = {
  groupId: string
  snapshot: ScheduleBaselineSnapshot | null
}

const EVENT = 'lanpm-schedule-baseline'

export function publishScheduleBaseline(detail: ScheduleBaselineEvent): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}

export function subscribeScheduleBaseline(
  listener: (detail: ScheduleBaselineEvent) => void
): () => void {
  const onEvent = (ev: Event): void => {
    listener((ev as CustomEvent<ScheduleBaselineEvent>).detail)
  }
  window.addEventListener(EVENT, onEvent)
  return () => window.removeEventListener(EVENT, onEvent)
}

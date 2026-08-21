import type { TaskStatus } from '@shared/task/types'
import type { ColumnWipLimits } from '@shared/task/columnWip'

export type AgileWipEvent = {
  groupId: string
  over: TaskStatus[]
  limits: ColumnWipLimits
}

const EVENT = 'lanpm-agile-wip'

export function publishAgileWip(detail: AgileWipEvent): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}

export function subscribeAgileWip(listener: (detail: AgileWipEvent) => void): () => void {
  const onEvent = (ev: Event): void => {
    listener((ev as CustomEvent<AgileWipEvent>).detail)
  }
  window.addEventListener(EVENT, onEvent)
  return () => window.removeEventListener(EVENT, onEvent)
}

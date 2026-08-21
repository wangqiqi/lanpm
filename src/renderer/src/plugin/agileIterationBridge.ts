export type AgileIterationBoardFilter = {
  groupId: string
  currentIterationId: string | null
}

const EVENT = 'lanpm-agile-iteration'

export function publishAgileIteration(detail: AgileIterationBoardFilter): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail }))
}

export function subscribeAgileIteration(
  listener: (detail: AgileIterationBoardFilter) => void
): () => void {
  const onEvent = (ev: Event): void => {
    listener((ev as CustomEvent<AgileIterationBoardFilter>).detail)
  }
  window.addEventListener(EVENT, onEvent)
  return () => window.removeEventListener(EVENT, onEvent)
}

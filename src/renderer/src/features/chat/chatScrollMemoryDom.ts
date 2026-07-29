import type { ChatScrollMemory } from '@shared/chat/scrollMemory'
import { isPinnedToBottom } from '@shared/chat/scrollPin'

/** 视口顶附近第一条带 `data-msg-id` 的消息 */
export function findTopVisibleMsgId(listEl: HTMLElement): string | undefined {
  const listTop = listEl.getBoundingClientRect().top
  const nodes = listEl.querySelectorAll('[data-msg-id]')
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const rect = node.getBoundingClientRect()
    if (rect.bottom > listTop + 4) {
      return node.getAttribute('data-msg-id') ?? undefined
    }
  }
  return undefined
}

export function captureScrollMemory(listEl: HTMLElement): ChatScrollMemory {
  if (isPinnedToBottom(listEl)) {
    return { pinned: true }
  }
  return {
    pinned: false,
    anchorMsgId: findTopVisibleMsgId(listEl)
  }
}

export function restoreScrollPosition(
  listEl: HTMLElement,
  memory: ChatScrollMemory | undefined
): 'bottom' | 'anchor' | 'fallback-bottom' {
  if (!memory || memory.pinned) {
    listEl.scrollTop = listEl.scrollHeight
    return memory?.pinned ? 'bottom' : 'fallback-bottom'
  }
  const id = memory.anchorMsgId
  if (!id) {
    listEl.scrollTop = listEl.scrollHeight
    return 'fallback-bottom'
  }
  const anchor = listEl.querySelector(`[data-msg-id="${CSS.escape(id)}"]`)
  if (anchor instanceof HTMLElement) {
    anchor.scrollIntoView({ block: 'start' })
    return 'anchor'
  }
  listEl.scrollTop = listEl.scrollHeight
  return 'fallback-bottom'
}

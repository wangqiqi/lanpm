/** 单会话内（内存）群聊滚动记忆 — 不跨重启持久化 */

export interface ChatScrollMemory {
  /** 在底部附近（跟 `isPinnedToBottom` 一致） */
  pinned: boolean
  /** 不在底部时，视口顶附近第一条消息的 msgId */
  anchorMsgId?: string
}

/** 首屏/回群时是否应滚到最新消息（无记忆或 pinned） */
export function shouldScrollToBottomOnInitialLoad(memory?: ChatScrollMemory): boolean {
  if (!memory) return true
  if (memory.pinned) return true
  if (!memory.anchorMsgId) return true
  return false
}

/** 区分首屏加载 vs 上拉加载更早消息（prepend） */
export function classifyMessageCountIncrease(
  prevCount: number,
  delta: number,
  scrollTop: number,
  prependNearTopPx = 120
): 'none' | 'initial' | 'prepend' | 'append' {
  if (delta <= 0) return 'none'
  if (prevCount === 0) return 'initial'
  if (scrollTop < prependNearTopPx) return 'prepend'
  return 'append'
}

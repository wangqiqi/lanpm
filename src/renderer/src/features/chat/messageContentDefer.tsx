import { createContext, useContext } from 'react'

export type MessageContentDeferContextValue = {
  deferHeavyContent: boolean
}

const MessageContentDeferContext = createContext<MessageContentDeferContextValue>({
  deferHeavyContent: false
})

export function MessageContentDeferProvider({
  deferHeavyContent,
  children
}: {
  deferHeavyContent: boolean
  children: React.ReactNode
}): React.ReactElement {
  return (
    <MessageContentDeferContext.Provider value={{ deferHeavyContent }}>
      {children}
    </MessageContentDeferContext.Provider>
  )
}

export function useDeferHeavyContent(): boolean {
  return useContext(MessageContentDeferContext).deferHeavyContent
}

/** 严格视口判定：虚拟行在 scroll 视口 ± margin 外则 defer */
export function shouldDeferHeavyContentForRow(
  rowStart: number,
  rowSize: number,
  scrollOffset: number,
  viewportHeight: number,
  marginPx = 64
): boolean {
  if (viewportHeight <= 0) return false
  const rowBottom = rowStart + rowSize
  const viewTop = scrollOffset - marginPx
  const viewBottom = scrollOffset + viewportHeight + marginPx
  return rowBottom < viewTop || rowStart > viewBottom
}

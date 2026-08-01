import { createContext, useContext } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import type { TaskLocateView } from '@renderer/features/task/useLocateTask'

export type ChatMessageActionsValue = {
  groupId: string
  navigate: NavigateFunction
  locateTask: (taskId: string, view: TaskLocateView) => void
}

const ChatMessageActionsContext = createContext<ChatMessageActionsValue | null>(null)

export function ChatMessageActionsProvider({
  children,
  value
}: {
  children: React.ReactNode
  value: ChatMessageActionsValue
}): React.ReactElement {
  return (
    <ChatMessageActionsContext.Provider value={value}>{children}</ChatMessageActionsContext.Provider>
  )
}

export function useChatMessageActions(): ChatMessageActionsValue {
  const ctx = useContext(ChatMessageActionsContext)
  if (!ctx) {
    throw new Error('useChatMessageActions must be used within ChatMessageActionsProvider')
  }
  return ctx
}

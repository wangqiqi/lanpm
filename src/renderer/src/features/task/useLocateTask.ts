import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppView } from '@shared/navigation/types'
import { groupViewPath } from '@renderer/routes/paths'

export type TaskLocateView = Extract<AppView, 'board' | 'tree' | 'gantt'>

/** 跨视图跳转并高亮指定任务 */
export function useLocateTask(groupId: string): (taskId: string, view: TaskLocateView) => void {
  const navigate = useNavigate()
  return useCallback(
    (taskId: string, view: TaskLocateView) => {
      if (!groupId) return
      navigate(groupViewPath(groupId, view), { state: { highlightTaskId: taskId } })
    },
    [groupId, navigate]
  )
}

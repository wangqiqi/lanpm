import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { groupViewPath } from '@renderer/routes/paths'
import { useNavigationStore } from '@renderer/stores/navigationStore'

/** 桌面通知点击 → 切换到预约群聊 */
export function useNotificationNavigation(): void {
  const navigate = useNavigate()
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)

  useEffect(() => {
    let api: ReturnType<typeof getLanpmApi>
    try {
      api = getLanpmApi()
    } catch {
      return
    }
    if (!api.notification.onNavigate) return

    return api.notification.onNavigate(({ groupId }) => {
      const trimmed = groupId.trim()
      if (!trimmed) return
      setActiveGroupId(trimmed)
      navigate(groupViewPath(trimmed, 'chat'))
    })
  }, [navigate, setActiveGroupId])
}

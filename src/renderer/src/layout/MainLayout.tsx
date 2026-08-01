import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import TopBar from '@renderer/layout/TopBar'
import BottomNav from '@renderer/layout/BottomNav'
import CommandPalette from '@renderer/layout/CommandPalette'
import { useChatNotifications } from '@renderer/features/chat/useChatNotifications'
import { useDueTaskNotifications } from '@renderer/features/task/useDueTaskNotifications'
import { useMeetingScheduleReminders } from '@renderer/features/meeting/useMeetingScheduleReminders'
import { useNotificationNavigation } from '@renderer/features/meeting/useNotificationNavigation'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useUiStore } from '@renderer/stores/uiStore'
import AiAssistantShell from '@renderer/features/ai/AiAssistantShell'
import styles from './MainLayout.module.css'

export default function MainLayout(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const location = useLocation()
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const rememberNonCockpitPath = useNavigationStore((s) => s.rememberNonCockpitPath)
  const whiteboardZen = useUiStore((s) => s.whiteboardZen)

  useChatNotifications()
  useDueTaskNotifications()
  useMeetingScheduleReminders()
  useNotificationNavigation()

  useEffect(() => {
    if (!/\/whiteboard$/.test(location.pathname) && whiteboardZen) {
      useUiStore.getState().setWhiteboardZen(false)
    }
  }, [location.pathname, whiteboardZen])

  useEffect(() => {
    if (groupId) setActiveGroupId(groupId)
  }, [groupId, setActiveGroupId])

  useEffect(() => {
    if (/^\/g\/[^/]+\//.test(location.pathname)) {
      rememberNonCockpitPath(location.pathname)
    }
  }, [location.pathname, rememberNonCockpitPath])

  const showBottomNav = /^\/g\/[^/]+\//.test(location.pathname) && !whiteboardZen
  const isChatView = /\/g\/[^/]+\/chat$/.test(location.pathname)
  const isCockpitView = location.pathname.startsWith('/cockpit')
  const isWhiteboard = /\/g\/[^/]+\/whiteboard$/.test(location.pathname)

  return (
    <div className={`${styles.shell} ${whiteboardZen ? styles.shellZen : ''}`}>
      {!whiteboardZen ? (
        <div className={styles.barSlot}>
          <TopBar />
        </div>
      ) : null}
      <main
        className={`${styles.main} ${isChatView ? styles.mainChat : ''} ${
          isCockpitView ? styles.mainCockpit : ''
        } ${whiteboardZen && isWhiteboard ? styles.mainZen : ''}`}
      >
        <Outlet />
      </main>
      {showBottomNav ? (
        <div className={styles.navSlot}>
          <BottomNav />
        </div>
      ) : null}
      <AiAssistantShell />
      <CommandPalette />
    </div>
  )
}

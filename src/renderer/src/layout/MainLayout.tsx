import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import TopBar from '@renderer/layout/TopBar'
import BottomNav from '@renderer/layout/BottomNav'
import { useChatNotifications } from '@renderer/features/chat/useChatNotifications'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useUiStore } from '@renderer/stores/uiStore'
import styles from './MainLayout.module.css'

export default function MainLayout(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const location = useLocation()
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const rememberNonCockpitPath = useNavigationStore((s) => s.rememberNonCockpitPath)
  const whiteboardZen = useUiStore((s) => s.whiteboardZen)

  useChatNotifications()

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
          whiteboardZen && isWhiteboard ? styles.mainZen : ''
        }`}
      >
        <Outlet />
      </main>
      {showBottomNav ? (
        <div className={styles.barSlot}>
          <BottomNav />
        </div>
      ) : null}
    </div>
  )
}

import { useEffect } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import TopBar from '@renderer/layout/TopBar'
import BottomNav from '@renderer/layout/BottomNav'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import styles from './MainLayout.module.css'

export default function MainLayout(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const location = useLocation()
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)

  useEffect(() => {
    if (groupId) setActiveGroupId(groupId)
  }, [groupId, setActiveGroupId])

  const showBottomNav = /^\/g\/[^/]+\//.test(location.pathname)

  return (
    <div className={styles.shell}>
      <TopBar />
      <main className={styles.main}>
        <Outlet />
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  )
}

import { useEffect } from 'react'
import { Spin } from 'antd'
import { useIdentityStore } from '@renderer/stores/identityStore'
import SetupWizard from '@renderer/features/setup/SetupWizard'
import AppRouter from '@renderer/app/AppRouter'
import type { SetupStatus } from '@shared/identity'
import styles from './styles/App.module.css'

export default function App(): React.ReactElement {
  const hydrated = useIdentityStore((s) => s.hydrated)
  const configured = useIdentityStore((s) => s.configured)
  const setFromStatus = useIdentityStore((s) => s.setFromStatus)
  const setHydrated = useIdentityStore((s) => s.setHydrated)

  useEffect(() => {
    let cancelled = false
    void window.lanpm.identity
      .getSetupStatus()
      .then((status) => {
        if (!cancelled) {
          setFromStatus(status.configured, status.user, status.device)
        }
      })
      .catch(() => {
        if (!cancelled) setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [setFromStatus, setHydrated])

  const handleSetupComplete = (status: SetupStatus): void => {
    setFromStatus(status.configured, status.user, status.device)
  }

  if (!hydrated) {
    return (
      <div className={styles.boot}>
        <Spin size="large" tip="正在加载…" />
      </div>
    )
  }

  if (!configured) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  return <AppRouter />
}

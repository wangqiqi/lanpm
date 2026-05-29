import { useCallback, useEffect } from 'react'
import { Button, Spin, Typography } from 'antd'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import SetupWizard from '@renderer/features/setup/SetupWizard'
import AppRouter from '@renderer/app/AppRouter'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import type { SetupStatus } from '@shared/identity'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './styles/App.module.css'

export default function App(): React.ReactElement {
  const { t } = useI18n()
  const hydrated = useIdentityStore((s) => s.hydrated)
  const configured = useIdentityStore((s) => s.configured)
  const bootFailed = useIdentityStore((s) => s.bootFailed)
  const setFromStatus = useIdentityStore((s) => s.setFromStatus)
  const setHydrated = useIdentityStore((s) => s.setHydrated)
  const setBootFailed = useIdentityStore((s) => s.setBootFailed)
  const loadGroups = useNavigationStore((s) => s.loadGroups)

  const loadIdentity = useCallback(() => {
    let cancelled = false
    setBootFailed(false)
    setHydrated(false)
    try {
      void getLanpmApi()
        .identity.getSetupStatus()
        .then((status) => {
          if (!cancelled) {
            setFromStatus(status.configured, status.user, status.device)
            if (status.configured) void loadGroups()
          }
        })
        .catch(() => {
          if (!cancelled) setBootFailed(true)
        })
    } catch {
      if (!cancelled) setBootFailed(true)
    }
    return () => {
      cancelled = true
    }
  }, [setFromStatus, setHydrated, setBootFailed, loadGroups])

  useEffect(() => {
    if (!configured) return
    const unsub = getLanpmApi().group.onListChanged(() => void loadGroups())
    return unsub
  }, [configured, loadGroups])

  useEffect(() => loadIdentity(), [loadIdentity])

  const handleSetupComplete = (status: SetupStatus): void => {
    setFromStatus(status.configured, status.user, status.device)
    void loadGroups()
  }

  if (!hydrated) {
    return (
      <div className={styles.boot}>
        <Spin size="large" tip={t('common.loading')}>
          <div className={styles.bootSpinNest} />
        </Spin>
        <Typography.Text type="secondary" className={styles.bootHint}>
          {t('common.loading')}
        </Typography.Text>
      </div>
    )
  }

  if (bootFailed) {
    return (
      <div className={styles.boot}>
        <Typography.Text type="danger">{t('app.identityLoadFailed')}</Typography.Text>
        <Button type="primary" className={styles.bootRetry} onClick={() => loadIdentity()}>
          {t('app.identityRetry')}
        </Button>
      </div>
    )
  }

  if (!configured) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  return <AppRouter />
}

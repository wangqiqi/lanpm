import { useEffect, useRef } from 'react'
import { Button, Spin, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import SetupWizard from '@renderer/features/setup/SetupWizard'
import AppRouter from '@renderer/app/AppRouter'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import type { SetupStatus } from '@shared/identity'
import { translate } from '@renderer/i18n/messages'
import type { MessageKey } from '@renderer/i18n/types'
import { useUiStore } from '@renderer/stores/uiStore'
import { useNavPreferencesStore } from '@renderer/stores/navPreferencesStore'
import { useI18n } from '@renderer/i18n/useI18n'
import {
  unwireTaskAwarenessPush,
  wireTaskAwarenessPush
} from '@renderer/stores/taskAwarenessStore'
import {
  unwireGroupTagPush,
  wireGroupTagPush
} from '@renderer/stores/groupTagStore'
import styles from './styles/App.module.css'

export default function App(): React.ReactElement {
  const { t } = useI18n()
  const locale = useUiStore((s) => s.locale)
  const { message } = useLanpmApp()
  const messageRef = useRef(message)
  messageRef.current = message
  const hydrated = useIdentityStore((s) => s.hydrated)
  const configured = useIdentityStore((s) => s.configured)
  const bootFailed = useIdentityStore((s) => s.bootFailed)
  const setFromStatus = useIdentityStore((s) => s.setFromStatus)
  const setHydrated = useIdentityStore((s) => s.setHydrated)
  const setBootFailed = useIdentityStore((s) => s.setBootFailed)
  const loadGroups = useNavigationStore((s) => s.loadGroups)
  const loadGroupsRef = useRef(loadGroups)
  loadGroupsRef.current = loadGroups

  const loadIdentity = (opts?: { resetHydrated?: boolean }): (() => void) => {
    let cancelled = false
    setBootFailed(false)
    if (opts?.resetHydrated) setHydrated(false)
    try {
      void getLanpmApi()
        .identity.getSetupStatus()
        .then((status) => {
          if (!cancelled) {
            setFromStatus(status.configured, status.user, status.device)
            void loadGroupsRef.current().then((ok) => {
              if (!ok) {
                messageRef.current.error?.(
                  translate(locale, 'nav.groupsLoadFailed')
                )
              }
            })
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
  }

  useEffect(() => {
    if (!configured) return
    const unsub = getLanpmApi().group.onListChanged(() => void loadGroupsRef.current())
    return unsub
  }, [configured])

  useEffect(() => {
    if (!configured) return
    void useNavPreferencesStore.getState().hydrate()
  }, [configured])

  useEffect(() => {
    if (!configured) return
    const syncGroup = (groupId: string): void => {
      useNavPreferencesStore.getState().setActiveGroupId(groupId || null)
    }
    syncGroup(useNavigationStore.getState().activeGroupId)
    return useNavigationStore.subscribe((state, prev) => {
      if (state.activeGroupId !== prev.activeGroupId) {
        syncGroup(state.activeGroupId)
      }
    })
  }, [configured])

  useEffect(() => {
    if (!configured) return
    wireTaskAwarenessPush()
    wireGroupTagPush()
    return () => {
      unwireTaskAwarenessPush()
      unwireGroupTagPush()
    }
  }, [configured])

  useEffect(() => {
    const unsub = getLanpmApi().onUserNotice((notice) => {
      const text = translate(locale, notice.messageKey as MessageKey, notice.params)
      if (notice.level === 'error') {
        messageRef.current.error?.(text)
      } else {
        messageRef.current.warning?.(text)
      }
    })
    return unsub
  }, [locale])

  useEffect(() => loadIdentity(), [])

  const handleSetupComplete = (status: SetupStatus): void => {
    setFromStatus(status.configured, status.user, status.device)
    void loadGroups().then((ok) => {
      if (!ok) message.error?.(t('nav.groupsLoadFailed'))
    })
  }

  if (!hydrated) {
    return (
      <div className={styles.boot}>
        <Spin size="large">
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
        <Button
          type="primary"
          className={styles.bootRetry}
          onClick={() => loadIdentity({ resetHydrated: true })}
        >
          {t('app.identityRetry')}
        </Button>
      </div>
    )
  }

  if (!configured) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  return (
    <div className={styles.appShell}>
      <AppRouter />
    </div>
  )
}

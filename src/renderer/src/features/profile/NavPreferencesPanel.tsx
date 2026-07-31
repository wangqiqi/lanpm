import { useCallback, useState } from 'react'
import { List, Switch, Typography } from 'antd'
import { HolderOutlined } from '@ant-design/icons'
import type { AppView } from '@shared/navigation/types'
import {
  isViewHideLocked,
  normalizeNavPreferences,
  type NavPreferences
} from '@shared/navigation/navPreferences'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import { useNavPreferencesStore } from '@renderer/stores/navPreferencesStore'
import styles from './NavPreferencesPanel.module.css'

const { Text } = Typography

function moveView(order: AppView[], from: number, to: number): AppView[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) {
    return order
  }
  const next = [...order]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/** Profile「导航与视图」— 全局 Tab 排序与显隐 */
export default function NavPreferencesPanel(): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const preferences = useNavPreferencesStore((s) => s.preferences)
  const setPreferences = useNavPreferencesStore((s) => s.setPreferences)
  const [busy, setBusy] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const persist = useCallback(
    async (next: NavPreferences): Promise<void> => {
      setBusy(true)
      try {
        await setPreferences(normalizeNavPreferences(next))
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('profile.navSaveFailed'))
      } finally {
        setBusy(false)
      }
    },
    [message, setPreferences, t]
  )

  const toggleView = (view: AppView, visible: boolean): void => {
    if (isViewHideLocked(preferences, view)) return
    const hidden = new Set(preferences.hiddenViews)
    if (visible) hidden.delete(view)
    else hidden.add(view)
    void persist({ ...preferences, hiddenViews: [...hidden] })
  }

  const onDrop = (toIndex: number): void => {
    if (dragIndex === null || dragIndex === toIndex) return
    const nextOrder = moveView(preferences.order, dragIndex, toIndex)
    setDragIndex(null)
    void persist({ ...preferences, order: nextOrder })
  }

  return (
    <div className={styles.panel}>
      <Text type="secondary">{t('profile.navHint')}</Text>
      <List
        className={styles.list}
        dataSource={preferences.order}
        renderItem={(view, index) => {
          const locked = isViewHideLocked(preferences, view)
          const visible = !preferences.hiddenViews.includes(view)
          return (
            <List.Item
              className={styles.row}
              draggable={!busy}
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => setDragIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(index)}
            >
              <span className={styles.handle} aria-hidden>
                <HolderOutlined />
              </span>
              <span className={styles.label}>{t(VIEW_MESSAGE_KEYS[view])}</span>
              <Switch
                checked={visible}
                disabled={locked || busy}
                onChange={(checked) => toggleView(view, checked)}
                aria-label={t('profile.navToggleAria', { view: t(VIEW_MESSAGE_KEYS[view]) })}
              />
            </List.Item>
          )
        }}
      />
      {lockedHint(t)}
    </div>
  )
}

function lockedHint(
  t: (key: 'profile.navLockedChat' | 'profile.navLockedTask', params?: never) => string
): React.ReactElement {
  return (
    <>
      <Text type="secondary" className={styles.footnote}>
        {t('profile.navLockedChat')}
      </Text>
      <Text type="secondary" className={styles.footnote}>
        {t('profile.navLockedTask')}
      </Text>
    </>
  )
}

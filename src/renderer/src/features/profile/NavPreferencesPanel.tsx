import { useCallback, useMemo, useState } from 'react'
import { Button, List, Segmented, Switch, Typography } from 'antd'
import { HolderOutlined } from '@ant-design/icons'
import type { AppView } from '@shared/navigation/types'
import {
  isNeverBottomNavContributedRoute,
  isNeverBottomNavView,
  isViewHideLocked,
  normalizeNavPreferences,
  type NavPreferences
} from '@shared/navigation/navPreferences'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import {
  hasGroupNavOverride,
  selectEditingPreferences,
  useNavPreferencesStore,
  type NavEditScope
} from '@renderer/stores/navPreferencesStore'
import { useContributedViews } from '@renderer/plugin/useContributedViews'
import type { MessageKey } from '@renderer/i18n/types'
import styles from './NavPreferencesPanel.module.css'

const { Text } = Typography

function moveItem<T>(order: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) {
    return order
  }
  const next = [...order]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item!)
  return next
}

/** Profile「导航与视图」— 核心 + 插件贡献 Tab 排序与显隐 */
export default function NavPreferencesPanel({
  activeGroupId
}: {
  activeGroupId?: string | null
}): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const document = useNavPreferencesStore((s) => s.document)
  const preferences = useNavPreferencesStore(selectEditingPreferences)
  const editScope = useNavPreferencesStore((s) => s.editScope)
  const setEditScope = useNavPreferencesStore((s) => s.setEditScope)
  const setPreferences = useNavPreferencesStore((s) => s.setPreferences)
  const clearGroupOverride = useNavPreferencesStore((s) => s.clearGroupOverride)
  const contributedViews = useContributedViews()
  const [busy, setBusy] = useState(false)
  const [dragCoreIndex, setDragCoreIndex] = useState<number | null>(null)
  const [dragPluginIndex, setDragPluginIndex] = useState<number | null>(null)

  const groupId = activeGroupId?.trim() || null
  const hasOverride = groupId ? hasGroupNavOverride(document, groupId) : false

  const pluginRoutes = useMemo(() => {
    const known = contributedViews.map((v) => v.route)
    const order = [...preferences.contributedOrder]
    for (const route of known) {
      if (!order.includes(route)) order.push(route)
    }
    return order.filter(
      (route) => known.includes(route) && !isNeverBottomNavContributedRoute(route)
    )
  }, [contributedViews, preferences.contributedOrder])

  const titleByRoute = useMemo(() => {
    const map = new Map<string, string>()
    for (const view of contributedViews) {
      map.set(view.route, t(view.titleKey as MessageKey))
    }
    return map
  }, [contributedViews, t])

  const coreOrder = useMemo(
    () => preferences.order.filter((view) => !isNeverBottomNavView(view)),
    [preferences.order]
  )

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
    if (isNeverBottomNavView(view) || isViewHideLocked(preferences, view)) return
    const hidden = new Set(preferences.hiddenViews)
    if (visible) hidden.delete(view)
    else hidden.add(view)
    void persist({ ...preferences, hiddenViews: [...hidden] })
  }

  const togglePlugin = (route: string, visible: boolean): void => {
    if (isNeverBottomNavContributedRoute(route)) return
    const hidden = new Set(preferences.hiddenContributedRoutes)
    if (visible) hidden.delete(route)
    else hidden.add(route)
    void persist({ ...preferences, hiddenContributedRoutes: [...hidden] })
  }

  const onDropCore = (toIndex: number): void => {
    if (dragCoreIndex === null || dragCoreIndex === toIndex) return
    const nextCore = moveItem(coreOrder, dragCoreIndex, toIndex)
    const canvas = preferences.order.filter((view) => isNeverBottomNavView(view))
    setDragCoreIndex(null)
    void persist({ ...preferences, order: [...nextCore, ...canvas] })
  }

  const onDropPlugin = (toIndex: number): void => {
    if (dragPluginIndex === null || dragPluginIndex === toIndex) return
    const nextOrder = moveItem(pluginRoutes, dragPluginIndex, toIndex)
    setDragPluginIndex(null)
    void persist({ ...preferences, contributedOrder: nextOrder })
  }

  return (
    <div className={styles.panel}>
      {groupId ? (
        <div className={styles.scopeRow}>
          <Segmented<NavEditScope>
            value={editScope}
            disabled={busy}
            options={[
              { label: t('profile.navScopeGlobal'), value: 'global' },
              { label: t('profile.navScopeGroup'), value: 'group' }
            ]}
            onChange={(value) => setEditScope(value)}
          />
          {editScope === 'group' && hasOverride ? (
            <Button
              size="small"
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void clearGroupOverride(groupId)
                  .then(() => message.success(t('profile.navFollowGlobalDone')))
                  .catch((err) =>
                    message.error(err instanceof Error ? err.message : t('profile.navSaveFailed'))
                  )
                  .finally(() => setBusy(false))
              }}
            >
              {t('profile.navFollowGlobal')}
            </Button>
          ) : null}
        </div>
      ) : null}
      <Text type="secondary">
        {editScope === 'group' && groupId ? t('profile.navHintGroup') : t('profile.navHint')}
      </Text>
      <List
        className={styles.list}
        dataSource={coreOrder}
        renderItem={(view, index) => {
          const locked = isViewHideLocked(preferences, view)
          const visible = !preferences.hiddenViews.includes(view)
          return (
            <List.Item
              className={styles.row}
              draggable={!busy}
              onDragStart={() => setDragCoreIndex(index)}
              onDragEnd={() => setDragCoreIndex(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDropCore(index)}
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
      {pluginRoutes.length > 0 ? (
        <>
          <Text type="secondary" className={styles.footnote}>
            {t('profile.navPluginHint')}
          </Text>
          <List
            className={styles.list}
            dataSource={pluginRoutes}
            renderItem={(route, index) => {
              const visible = !preferences.hiddenContributedRoutes.includes(route)
              const label = titleByRoute.get(route) ?? route
              return (
                <List.Item
                  className={styles.row}
                  draggable={!busy}
                  onDragStart={() => setDragPluginIndex(index)}
                  onDragEnd={() => setDragPluginIndex(null)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => onDropPlugin(index)}
                >
                  <span className={styles.handle} aria-hidden>
                    <HolderOutlined />
                  </span>
                  <span className={styles.label}>{label}</span>
                  <Switch
                    checked={visible}
                    disabled={busy}
                    onChange={(checked) => togglePlugin(route, checked)}
                    aria-label={t('profile.navToggleAria', { view: label })}
                  />
                </List.Item>
              )
            }}
          />
        </>
      ) : null}
      {lockedHint(t)}
    </div>
  )
}

function lockedHint(
  t: (
    key: 'profile.navLockedChat' | 'profile.navLockedTask' | 'profile.navLockedCanvas',
    params?: never
  ) => string
): React.ReactElement {
  return (
    <>
      <Text type="secondary" className={styles.footnote}>
        {t('profile.navLockedChat')}
      </Text>
      <Text type="secondary" className={styles.footnote}>
        {t('profile.navLockedTask')}
      </Text>
      <Text type="secondary" className={styles.footnote}>
        {t('profile.navLockedCanvas')}
      </Text>
    </>
  )
}

import { useEffect, useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Badge, Tooltip } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import {
  CommentOutlined,
  LockOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  FolderOutlined
} from '@ant-design/icons'
import { FUNCTION_GUIDE_STORAGE_KEY } from '@shared/navigation/guide'
import { useI18n } from '@renderer/i18n/useI18n'
import { NAV_DISABLED_HINT_KEYS, VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import type { AppView } from '@shared/navigation/types'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath, VIEW_TABS } from '@renderer/routes/paths'
import { useBadgeStore } from '@renderer/stores/badgeStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import styles from './BottomNav.module.css'

const VIEW_ICONS: Record<AppView, React.ReactNode> = {
  chat: <CommentOutlined />,
  board: <ProjectOutlined />,
  tree: <ApartmentOutlined />,
  gantt: <BarChartOutlined />,
  files: <FolderOutlined />
}

export default function BottomNav(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()
  const { modal } = useLanpmApp()
  const getGroupType = useNavigationStore((s) => s.getGroupType)

  const activeView = useMemo((): AppView | null => {
    const m = location.pathname.match(/\/g\/[^/]+\/(\w+)/)
    const v = m?.[1]
    if (v === 'chat' || v === 'board' || v === 'tree' || v === 'gantt' || v === 'files') {
      return v
    }
    return null
  }, [location.pathname])

  const gid = groupId ?? ''
  const badges = useBadgeStore((s) => s.badges)
  const refreshBadges = useBadgeStore((s) => s.refresh)

  useEffect(() => {
    if (!gid) return
    void refreshBadges(gid)
    const unsubChat = getLanpmApi().chat.onMessage((msg) => {
      if (msg.groupId === gid) void refreshBadges(gid)
    })
    const unsubTasks = getLanpmApi().task.onTasksChanged((g) => {
      if (g === gid) void refreshBadges(gid)
    })
    return () => {
      unsubChat()
      unsubTasks()
    }
  }, [gid, refreshBadges])

  const groupType = groupId ? getGroupType(groupId) : null

  const visibleTabs = useMemo(() => {
    if (!groupId || !groupType) return []
    if (groupType === 'anonymous') {
      return VIEW_TABS.filter((tab) => isViewAllowedForGroup(groupType, tab.view))
    }
    return VIEW_TABS
  }, [groupId, groupType])

  if (!groupId || !groupType) return <></>

  const tabBadgeCount = (view: AppView): number => {
    if (view === 'chat') return badges.chatUnread
    if (view === 'board') return badges.boardTodo
    return 0
  }

  const maybeShowFunctionGuide = (): void => {
    if (groupType !== 'function') return
    if (localStorage.getItem(FUNCTION_GUIDE_STORAGE_KEY)) return
    modal.info({
      title: t('nav.functionGuideTitle'),
      content: t('nav.functionGuideBody'),
      okText: t('common.confirm'),
      onOk: () => localStorage.setItem(FUNCTION_GUIDE_STORAGE_KEY, '1')
    })
  }

  return (
    <nav className={styles.nav} aria-label={t('nav.ariaLabel')}>
      {visibleTabs.map((tab) => {
        const allowed = isViewAllowedForGroup(groupType, tab.view)
        const active = activeView === tab.view
        const tabRegion = (
          <span
            className={`${styles.tabWrap} ${!allowed ? styles.tabWrapDisabled : ''}`}
            onClick={() => {
              if (!allowed) maybeShowFunctionGuide()
            }}
          >
            <button
              type="button"
              className={`${styles.tab} ${active ? styles.tabActive : ''} ${!allowed ? styles.tabDisabled : ''}`}
              disabled={!allowed}
              aria-disabled={!allowed}
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (allowed) navigate(groupViewPath(groupId, tab.view))
              }}
            >
              <span className={styles.icon}>
                <Badge count={tabBadgeCount(tab.view)} size="small" offset={[-2, 2]}>
                  {VIEW_ICONS[tab.view]}
                </Badge>
              </span>
              <span className={styles.label}>
                {!allowed ? <LockOutlined className={styles.tabLock} aria-hidden /> : null}
                {t(VIEW_MESSAGE_KEYS[tab.view])}
              </span>
            </button>
          </span>
        )
        if (allowed) {
          return (
            <span key={tab.view} className={styles.tabSlot}>
              {tabRegion}
            </span>
          )
        }
        return (
          <Tooltip
            key={tab.view}
            title={t(NAV_DISABLED_HINT_KEYS[groupType])}
            classNames={{ root: styles.tabSlot }}
          >
            {tabRegion}
          </Tooltip>
        )
      })}
    </nav>
  )
}

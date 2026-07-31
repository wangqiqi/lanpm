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
  CalendarOutlined,
  HighlightOutlined,
  FolderOutlined,
  NodeIndexOutlined
} from '@ant-design/icons'
import { FUNCTION_GUIDE_STORAGE_KEY } from '@shared/navigation/guide'
import { useI18n } from '@renderer/i18n/useI18n'
import { NAV_DISABLED_HINT_KEYS, VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import {
  resolveVisibleContributedRoutes,
  resolveVisibleViews
} from '@shared/navigation/navPreferences'
import type { AppView } from '@shared/navigation/types'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useNavPreferencesStore } from '@renderer/stores/navPreferencesStore'
import { groupViewPath, contributedViewPath, VIEW_TABS, isCoreAppView, parseGroupViewSegment } from '@renderer/routes/paths'
import { useContributedViews } from '@renderer/plugin/useContributedViews'
import type { MessageKey } from '@renderer/i18n/types'
import { useBadgeStore } from '@renderer/stores/badgeStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import styles from './BottomNav.module.css'

const VIEW_ICONS: Record<AppView, React.ReactNode> = {
  chat: <CommentOutlined />,
  board: <ProjectOutlined />,
  tree: <ApartmentOutlined />,
  gantt: <BarChartOutlined />,
  calendar: <CalendarOutlined />,
  whiteboard: <HighlightOutlined />,
  files: <FolderOutlined />
}

const CONTRIBUTED_ICONS: Record<string, React.ReactNode> = {
  apartment: <ApartmentOutlined />,
  mindmap: <NodeIndexOutlined />
}

function contributedTabIcon(icon?: string): React.ReactNode {
  if (!icon) return <NodeIndexOutlined />
  return CONTRIBUTED_ICONS[icon] ?? <NodeIndexOutlined />
}

export default function BottomNav(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()
  const { modal } = useLanpmApp()
  const getGroupType = useNavigationStore((s) => s.getGroupType)

  const activeView = useMemo((): AppView | null => {
    const segment = parseGroupViewSegment(location.pathname)
    return isCoreAppView(segment) ? segment : null
  }, [location.pathname])

  const activeContributedRoute = useMemo((): string | null => {
    const segment = parseGroupViewSegment(location.pathname)
    if (!segment || isCoreAppView(segment)) return null
    return segment
  }, [location.pathname])

  const contributedViews = useContributedViews()

  const gid = groupId ?? ''
  const badges = useBadgeStore((s) => s.badges)
  const boardRecentDot = useBadgeStore((s) => s.boardRecentDot)
  const refreshBadges = useBadgeStore((s) => s.refresh)
  const markBoardSeenAndRefresh = useBadgeStore((s) => s.markBoardSeenAndRefresh)

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

  useEffect(() => {
    if (!gid || activeView !== 'board') return
    void markBoardSeenAndRefresh(gid)
  }, [gid, activeView, markBoardSeenAndRefresh])

  const groupType = groupId ? getGroupType(groupId) : null
  const navPreferences = useNavPreferencesStore((s) => s.preferences)

  const visibleTabs = useMemo(() => {
    if (!groupId || !groupType) return []
    const visibleViews = resolveVisibleViews(groupType, navPreferences, groupId)
    const order = new Map(visibleViews.map((view, index) => [view, index]))
    return VIEW_TABS.filter((tab) => visibleViews.includes(tab.view)).sort(
      (a, b) => (order.get(a.view) ?? 0) - (order.get(b.view) ?? 0)
    )
  }, [groupId, groupType, navPreferences])

  const visibleContributedTabs = useMemo(() => {
    if (!groupType) return []
    const forGroup = contributedViews.filter((view) => view.groupTypes.includes(groupType))
    const knownRoutes = forGroup.map((view) => view.route)
    const visibleRoutes = resolveVisibleContributedRoutes(navPreferences, knownRoutes)
    const byRoute = new Map(forGroup.map((view) => [view.route, view]))
    return visibleRoutes
      .map((route) => byRoute.get(route))
      .filter((view): view is (typeof forGroup)[number] => Boolean(view))
  }, [contributedViews, groupType, navPreferences])

  if (!groupId || !groupType) return <></>

  const tabBadgeCount = (view: AppView): number => {
    if (view === 'chat') return badges.chatUnread
    if (view === 'board') return badges.boardMineOpen
    return 0
  }

  const tabBadgeDot = (view: AppView): boolean => {
    if (view !== 'board') return false
    if (badges.boardMineOpen > 0) return false
    return boardRecentDot
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
        const count = tabBadgeCount(tab.view)
        const showDot = tabBadgeDot(tab.view)
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
                <Badge
                  count={count}
                  dot={showDot}
                  size="small"
                  offset={[-2, 2]}
                >
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
      {visibleContributedTabs.map((tab) => {
        const active = activeContributedRoute === tab.route
        const titleKey = tab.titleKey as MessageKey
        return (
          <span key={`${tab.pluginId}:${tab.route}`} className={styles.tabSlot}>
            <button
              type="button"
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(contributedViewPath(groupId, tab.route))}
            >
              <span className={styles.icon}>{contributedTabIcon(tab.icon)}</span>
              <span className={styles.label}>{t(titleKey)}</span>
            </button>
          </span>
        )
      })}
    </nav>
  )
}

import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dropdown,
  Popover,
  Select,
  Tooltip,
  Typography,
  type MenuProps
} from 'antd'
import {
  CompassOutlined,
  DashboardOutlined,
  DeleteOutlined,
  GlobalOutlined,
  MoonOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
  RobotOutlined,
  SearchOutlined,
  SunOutlined
} from '@ant-design/icons'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import UserAvatar from '@renderer/ui/UserAvatar'
import { useUiStore } from '@renderer/stores/uiStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { isDmGroupId, getDmPeerUserId } from '@shared/chat/dmSession'
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import type { AppView, GroupType } from '@shared/navigation/types'
import { cockpitPath, cockpitReturnPath, groupViewPath } from '@renderer/routes/paths'
import CreateGroupModal from '@renderer/features/groups/CreateGroupModal'
import DiscoverModal from '@renderer/features/discover/DiscoverModal'
import ProfileModal from '@renderer/features/profile/ProfileModal'
import { useDmStore } from '@renderer/stores/dmStore'
import { resolveGroupDisplayName } from '@renderer/i18n/groupLabels'
import { useNetworkStore } from '@renderer/stores/networkStore'
import GlobalSearch from '@renderer/layout/GlobalSearch'
import ManualPeerModal from '@renderer/features/network/ManualPeerModal'
import RegionButton from '@renderer/ui/RegionButton'
import { useGroupPinStore } from '@renderer/stores/groupPinStore'
import { useBadgeStore } from '@renderer/stores/badgeStore'
import { useAiAssistantStore } from '@renderer/stores/aiAssistantStore'
import { LANPM_APP_VERSION } from '@shared/appVersion'
import { matchesGroupSearch } from '@shared/group/matchGroupSearch'
import { sortGroupsForSwitcher } from '@shared/group/sortGroups'
import logoUrl from '@resources/logo.svg'
import styles from './TopBar.module.css'

const { Text } = Typography

const GROUP_TYPE_KEYS: Record<GroupType, MessageKey> = {
  project: 'groupType.project',
  function: 'groupType.function',
  anonymous: 'groupType.anonymous'
}

const VIEW_PATH_RE = /^\/g\/[^/]+\/(\w+)/

export default function TopBar(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, formatError } = useI18n()
  const { modal, message } = useLanpmApp()
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const createGroup = useNavigationStore((s) => s.createGroup)
  const dissolveGroup = useNavigationStore((s) => s.dissolveGroup)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const lastNonCockpitPath = useNavigationStore((s) => s.lastNonCockpitPath)
  const [createOpen, setCreateOpen] = useState(false)
  const [discoverOpen, setDiscoverOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const user = useIdentityStore((s) => s.user)
  const localUserId = user?.userId
  const getDmSession = useDmStore((s) => s.getSession)
  const getPeerDisplayName = useDmStore((s) => s.getPeerDisplayName)
  const device = useIdentityStore((s) => s.device)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const setLocale = useUiStore((s) => s.setLocale)
  const networkStatus = useNetworkStore((s) => s.status)
  const refreshNetwork = useNetworkStore((s) => s.refresh)
  const reconnectNetwork = useNetworkStore((s) => s.reconnect)
  const connectManualPeer = useNetworkStore((s) => s.connectManualPeer)
  const networkLoading = useNetworkStore((s) => s.loading)
  const [manualPeerOpen, setManualPeerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [netDotPulse, setNetDotPulse] = useState(false)
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({})
  const prevLinkStateRef = useRef<string | undefined>(undefined)
  const pinnedIds = useGroupPinStore((s) => s.pinnedIds)
  const togglePin = useGroupPinStore((s) => s.togglePin)
  const badges = useBadgeStore((s) => s.badges)
  const boardRecentDot = useBadgeStore((s) => s.boardRecentDot)
  const openAssistant = useAiAssistantStore((s) => s.openAssistant)
  const refreshBadges = useBadgeStore((s) => s.refresh)
  const isPinned = useGroupPinStore((s) => s.isPinned)

  const refreshGroupActivity = (): void => {
    void getLanpmApi()
      .group.listLastActivity()
      .then(setLastActivity)
      .catch(() => setLastActivity({}))
  }

  useEffect(() => {
    void refreshNetwork()
    const timer = setInterval(() => void refreshNetwork({ silent: true }), 8000)
    return () => clearInterval(timer)
  }, [refreshNetwork])

  useEffect(() => {
    refreshGroupActivity()
  }, [activeGroupId, groups])

  useEffect(() => {
    if (!activeGroupId) return
    void refreshBadges(activeGroupId)
  }, [activeGroupId, refreshBadges])

  useEffect(() => {
    const next = networkStatus?.linkState
    if (next === undefined) return
    const prev = prevLinkStateRef.current
    prevLinkStateRef.current = next
    if (prev === undefined || prev === next) return
    setNetDotPulse(true)
    const t = window.setTimeout(() => setNetDotPulse(false), 420)
    return () => window.clearTimeout(t)
  }, [networkStatus?.linkState])

  const networkTooltip = networkStatus
    ? t(
        networkStatus.linkState === 'stub'
          ? 'topbar.networkStub'
          : networkStatus.linkState === 'online'
            ? 'topbar.networkOnline'
            : 'topbar.networkOffline',
        { count: networkStatus.peerCount }
      )
    : t('topbar.networkUnknown')

  const statusTooltip = useMemo(() => {
    const lines = [networkTooltip]
    if (badges.chatUnread > 0) {
      lines.push(t('topbar.badgeChatUnread', { count: badges.chatUnread }))
    }
    if (badges.boardMineOpen > 0) {
      lines.push(t('topbar.badgeBoardMine', { count: badges.boardMineOpen }))
    } else if (boardRecentDot) {
      lines.push(t('topbar.badgeBoardRecent'))
    }
    return lines.join('\n')
  }, [networkTooltip, badges.chatUnread, badges.boardMineOpen, boardRecentDot, t])

  const navigateToGroup = (groupId: string): void => {
    setActiveGroupId(groupId)
    const raw = VIEW_PATH_RE.exec(location.pathname)?.[1]
    const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'calendar', 'whiteboard', 'files']
    let view: AppView = views.includes(raw as AppView) ? (raw as AppView) : 'chat'
    const type = getGroupType(groupId)
    if (!isViewAllowedForGroup(type, view, groupId)) {
      view = defaultViewForGroup(type)
    }
    navigate(groupViewPath(groupId, view))
  }

  const isCockpitRoute = location.pathname.startsWith('/cockpit')
  const cockpitReturnTarget = cockpitReturnPath(activeGroupId, lastNonCockpitPath)

  const handleLogoClick = (): void => {
    if (isCockpitRoute) {
      navigate(cockpitReturnTarget)
      return
    }
    if (isDmGroupId(activeGroupId)) {
      const origin = useDmStore.getState().lastOriginGroupId
      navigate(groupViewPath(origin, 'chat'))
      return
    }
    navigate(groupViewPath(activeGroupId, 'chat'))
  }

  const handleGroupChange = (groupId: string): void => {
    if (groupId === activeGroupId) return

    const leavingAnonymous =
      getGroupType(activeGroupId) === 'anonymous' &&
      !isDmGroupId(activeGroupId) &&
      activeGroupId !== groupId

    if (leavingAnonymous) {
      modal.confirm({
        title: t('group.leaveAnonymousTitle'),
        content: t('group.leaveAnonymousContent'),
        okText: t('common.confirm'),
        cancelText: t('common.cancel'),
        onOk: () => {
          void getLanpmApi().group.leaveAnonymous(activeGroupId).finally(() => {
            navigateToGroup(groupId)
          })
        }
      })
      return
    }

    navigateToGroup(groupId)
  }

  const activeGroup = groups.find((g) => g.groupId === activeGroupId)
  const activeProjectName = useMemo(() => {
    if (!activeGroup) return activeGroupId || '—'
    return resolveGroupDisplayName(activeGroup, t)
  }, [activeGroup, activeGroupId, t])

  const cockpitBackLabel = t('cockpit.backToProject', { name: activeProjectName })
  const canDissolveGroup =
    Boolean(localUserId) &&
    Boolean(activeGroup) &&
    activeGroup?.createdBy === localUserId &&
    !isDmGroupId(activeGroupId)

  const handleDissolveGroup = (): void => {
    if (!activeGroup || !canDissolveGroup) return
    modal.confirm({
      title: t('group.dissolveTitle'),
      content: t('group.dissolveContent', { name: resolveGroupDisplayName(activeGroup, t) }),
      okText: t('group.dissolveConfirm'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await dissolveGroup(activeGroupId)
          const nextId = useNavigationStore.getState().activeGroupId
          const nextType = useNavigationStore.getState().getGroupType(nextId)
          navigate(groupViewPath(nextId, defaultViewForGroup(nextType)))
        } catch (err) {
          message.error(formatError(err, 'group.dissolveFailed'))
        }
      }
    })
  }

  const groupSelectOptions = useMemo(() => {
    const sorted = sortGroupsForSwitcher(
      groups.map((g) => ({
        groupId: g.groupId,
        createdAt: g.createdAt,
        lastMessageAt: lastActivity[g.groupId],
        pinned: pinnedIds.includes(g.groupId),
        group: g
      }))
    )
    const opts = sorted.map(({ group: g, pinned }) => {
      const name = resolveGroupDisplayName(g, t)
      return {
        value: g.groupId,
        searchText: name,
        pinned,
        label: (
          <span className={styles.groupOptionLabel}>
            <span className={styles.groupOptionText}>
              {name}{' '}
              <Text type="secondary" className={styles.groupType}>
                {t(GROUP_TYPE_KEYS[g.type])}
              </Text>
            </span>
          </span>
        )
      }
    })
    if (isDmGroupId(activeGroupId) && !opts.some((o) => o.value === activeGroupId)) {
      const session = getDmSession(activeGroupId)
      const peerId = localUserId ? getDmPeerUserId(activeGroupId, localUserId) : null
      const name =
        session?.peerDisplayName ??
        (peerId ? getPeerDisplayName(activeGroupId, peerId) : activeGroupId)
      const label = t('topbar.dmLabel', { name })
      opts.unshift({
        value: activeGroupId,
        searchText: label,
        pinned: pinnedIds.includes(activeGroupId),
        label: <span className={styles.groupOptionLabel}>{label}</span>
      })
    }
    return opts
  }, [
    groups,
    lastActivity,
    pinnedIds,
    activeGroupId,
    localUserId,
    getDmSession,
    getPeerDisplayName,
    t
  ])

  const userMenu: MenuProps['items'] = [
    {
      key: 'theme',
      label: theme === 'dark' ? t('topbar.themeToLight') : t('topbar.themeToDark'),
      icon: theme === 'dark' ? <SunOutlined /> : <MoonOutlined />,
      onClick: () => toggleTheme()
    },
    {
      key: 'locale',
      label: t('topbar.language'),
      icon: <GlobalOutlined />,
      children: [
        {
          key: 'zh-CN',
          label: t('topbar.localeZh'),
          onClick: () => setLocale('zh-CN')
        },
        {
          key: 'en-US',
          label: t('topbar.localeEn'),
          onClick: () => setLocale('en-US')
        }
      ]
    },
    { type: 'divider' },
    { key: 'profile', label: t('topbar.profile'), onClick: () => setProfileOpen(true) },
    {
      key: 'device',
      label: t('topbar.deviceWithName', { name: device?.deviceName ?? '—' })
    },
    {
      key: 'ip',
      label: t('topbar.ipWithAddress', { ip: networkStatus?.localIp ?? '—' })
    },
    {
      key: 'version',
      label: t('topbar.versionWithNumber', { version: LANPM_APP_VERSION }),
      disabled: true
    },
    { type: 'divider' },
    {
      key: 'api',
      label: t('topbar.apiKey'),
      onClick: () => navigate(cockpitPath(), { state: { openAiConfig: true } })
    },
    { type: 'divider' },
    {
      key: 'reset',
      label: t('topbar.resetIdentity'),
      danger: true,
      onClick: () => {
        modal.confirm({
          title: t('topbar.resetIdentityTitle'),
          content: t('topbar.resetIdentityContent'),
          okText: t('topbar.resetIdentityConfirm'),
          cancelText: t('common.cancel'),
          okButtonProps: { danger: true },
          onOk: async () => {
            const status = await getLanpmApi().identity.resetIdentity()
            useIdentityStore
              .getState()
              .setFromStatus(status.configured, status.user, status.device)
          }
        })
      }
    }
  ]

  return (
    <header className={styles.bar}>
      <div className={styles.barSection}>
        <div className={styles.barGroup}>
          <Tooltip
            title={isCockpitRoute ? cockpitBackLabel : t('topbar.logoAlt')}
          >
            <RegionButton variant="text" className={styles.logo} onClick={handleLogoClick}>
              <img
                src={logoUrl}
                alt={isCockpitRoute ? cockpitBackLabel : t('topbar.logoAlt')}
                className={styles.logoMark}
                width={24}
                height={24}
              />
              <span className={isCockpitRoute ? styles.logoBackLabel : undefined}>
                {isCockpitRoute ? cockpitBackLabel : t('topbar.logo')}
              </span>
            </RegionButton>
          </Tooltip>
          <Select
            className={styles.projectSelect}
            value={activeGroupId}
            onChange={handleGroupChange}
            options={groupSelectOptions}
            showSearch
            allowClear={false}
            placeholder={t('topbar.groupSearchPlaceholder')}
            optionFilterProp="searchText"
            filterOption={(input, option) =>
              matchesGroupSearch(String(option?.searchText ?? ''), input)
            }
            notFoundContent={t('topbar.groupSearchEmpty')}
            onDropdownVisibleChange={(open) => {
              if (open) refreshGroupActivity()
            }}
            optionRender={(option) => {
              const groupId = String(option.value ?? '')
              const pinned = isPinned(groupId)
              return (
                <div className={styles.groupOptionRow}>
                  <span className={styles.groupOptionText}>{option.data.label}</span>
                  <button
                    type="button"
                    className={styles.groupPinBtn}
                    aria-label={
                      pinned ? t('topbar.unpinGroup') : t('topbar.pinGroup')
                    }
                    aria-pressed={pinned}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      togglePin(groupId)
                    }}
                  >
                    {pinned ? <PushpinFilled /> : <PushpinOutlined />}
                  </button>
                </div>
              )
            }}
          />
        </div>
        <span className={styles.barDivider} aria-hidden />
        <div className={styles.barGroup}>
          <div className={styles.barWideActions} role="toolbar" aria-label={t('topbar.moreActions')}>
            {!isCockpitRoute ? (
              <button
                type="button"
                className={styles.barAction}
                onClick={() => navigate(cockpitPath())}
              >
                <span className={styles.barActionIcon} aria-hidden>
                  <DashboardOutlined />
                </span>
                <span className={styles.barActionLabel}>{t('topbar.cockpit')}</span>
              </button>
            ) : null}
            <button
              type="button"
              className={`${styles.barAction} ${styles.barActionSecondary}`}
              onClick={() =>
                openAssistant({
                  groupId: activeGroupId ?? null,
                  layout: window.matchMedia('(min-width: 1100px)').matches ? 'dock' : 'drawer',
                  entrySource: 'topbar'
                })
              }
            >
              <span className={styles.barActionIcon} aria-hidden>
                <RobotOutlined />
              </span>
              <span className={styles.barActionLabel}>{t('topbar.aiAssistant')}</span>
            </button>
            <button
              type="button"
              className={`${styles.barAction} ${styles.barActionSecondary}`}
              onClick={() => setDiscoverOpen(true)}
              data-testid="topbar-discover"
            >
              <span className={styles.barActionIcon} aria-hidden>
                <CompassOutlined />
              </span>
              <span className={styles.barActionLabel}>{t('topbar.discover')}</span>
            </button>
            <button
              type="button"
              className={`${styles.barAction} ${styles.barActionSecondary}`}
              onClick={() => setCreateOpen(true)}
            >
              <span className={styles.barActionIcon} aria-hidden>
                <PlusOutlined />
              </span>
              <span className={styles.barActionLabel}>{t('topbar.createGroup')}</span>
            </button>
            {canDissolveGroup ? (
              <button
                type="button"
                className={`${styles.barAction} ${styles.barActionSecondary} ${styles.barActionDanger}`}
                onClick={() => handleDissolveGroup()}
              >
                <span className={styles.barActionIcon} aria-hidden>
                  <DeleteOutlined />
                </span>
                <span className={styles.barActionLabel}>{t('group.dissolve')}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.barSection}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'refresh',
                label: t('topbar.networkRefresh'),
                onClick: () => void refreshNetwork()
              },
              {
                key: 'reconnect',
                label: t('topbar.networkOffline'),
                disabled: networkLoading,
                onClick: () => void reconnectNetwork()
              },
              {
                key: 'manual',
                label: t('topbar.addManualPeer'),
                onClick: () => setManualPeerOpen(true)
              }
            ]
          }}
        >
          <Tooltip title={statusTooltip}>
            <RegionButton
              variant="icon"
              className={styles.netBtn}
              aria-label={statusTooltip}
              disabled={networkLoading}
              onClick={() => {
                if (networkStatus?.linkState === 'offline') void reconnectNetwork()
                else void refreshNetwork()
              }}
            >
              <span
                className={`${styles.netDot} ${styles[`net_${networkStatus?.linkState ?? 'offline'}`]} ${netDotPulse ? styles.netDotPulse : ''}`}
              />
            </RegionButton>
          </Tooltip>
        </Dropdown>
        <ManualPeerModal
          open={manualPeerOpen}
          loading={networkLoading}
          onClose={() => setManualPeerOpen(false)}
          onSubmit={async (address) => {
            try {
              await connectManualPeer(address)
              modal.success({ content: t('topbar.manualPeerSuccess') })
              setManualPeerOpen(false)
            } catch (err) {
              message.error(
                formatError(err, 'topbar.manualPeerFailed')
              )
              throw err
            }
          }}
        />
        <div className={styles.searchWide}>
          <GlobalSearch className={styles.search} />
        </div>
        <Popover
          open={searchOpen}
          onOpenChange={setSearchOpen}
          trigger="click"
          placement="bottomRight"
          content={
            <div className={styles.searchPopoverBody}>
              <GlobalSearch className={styles.searchPopoverField} />
            </div>
          }
        >
          <RegionButton
            variant="icon"
            className={styles.searchNarrowTrigger}
            aria-label={t('topbar.searchPlaceholder')}
          >
            <SearchOutlined />
          </RegionButton>
        </Popover>
        <span className={styles.barDivider} aria-hidden />
        <div className={styles.barGroup}>
        <Dropdown menu={{ items: userMenu }} trigger={['click']}>
          <RegionButton variant="user" aria-label={t('topbar.userMenu')}>
            <UserAvatar
              size="small"
              displayName={user?.displayName ?? t('topbar.userFallback')}
              userId={user?.userId}
              avatarUrl={user?.avatarUrl}
            />
            <span className={styles.userName}>{user?.displayName ?? t('topbar.userFallback')}</span>
          </RegionButton>
        </Dropdown>
        </div>
      </div>
      <DiscoverModal
        open={discoverOpen}
        onClose={() => setDiscoverOpen(false)}
        onOpenManualPeer={() => setManualPeerOpen(true)}
      />
      <CreateGroupModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (input) => {
          const nav = await createGroup(input)
          navigate(groupViewPath(nav.groupId, defaultViewForGroup(nav.type)))
        }}
      />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </header>
  )
}

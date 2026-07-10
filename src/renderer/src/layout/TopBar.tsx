import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
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
  MoreOutlined,
  MoonOutlined,
  PlusOutlined,
  PushpinFilled,
  PushpinOutlined,
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
  const [lastActivity, setLastActivity] = useState<Record<string, string>>({})
  const pinnedIds = useGroupPinStore((s) => s.pinnedIds)
  const togglePin = useGroupPinStore((s) => s.togglePin)
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

  const navigateToGroup = (groupId: string): void => {
    setActiveGroupId(groupId)
    const raw = VIEW_PATH_RE.exec(location.pathname)?.[1]
    const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'files']
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

  const barOverflowItems: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = []
    if (!isCockpitRoute) {
      items.push({
        key: 'cockpit',
        label: t('topbar.cockpit'),
        icon: <DashboardOutlined />,
        onClick: () => navigate(cockpitPath())
      })
    }
    // Wide screen operations (Discover, Create Group, Dissolve) also nested inside "More" dropdown
    // to provide "One Principal CTA" simplicity and reduce clutter in the TopBar.
    items.push(
      {
        key: 'discover',
        label: t('topbar.discover'),
        icon: <CompassOutlined />,
        onClick: () => setDiscoverOpen(true)
      },
      {
        key: 'create',
        label: t('topbar.createGroup'),
        icon: <PlusOutlined />,
        onClick: () => setCreateOpen(true)
      }
    )
    if (canDissolveGroup) {
      items.push({
        key: 'dissolve',
        label: t('group.dissolve'),
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDissolveGroup()
      })
    }
    return items
  }, [
    isCockpitRoute,
    canDissolveGroup,
    t,
    navigate,
    handleDissolveGroup
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
          {barOverflowItems.length > 0 ? (
            <Dropdown menu={{ items: barOverflowItems }} trigger={['click']}>
              <RegionButton
                variant="icon"
                className={styles.barOverflowTrigger}
                aria-label={t('topbar.moreActions')}
              >
                <MoreOutlined />
              </RegionButton>
            </Dropdown>
          ) : null}
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
          <Tooltip title={networkTooltip}>
            <RegionButton
              variant="icon"
              className={styles.netBtn}
              aria-label={networkTooltip}
              disabled={networkLoading}
              onClick={() => {
                if (networkStatus?.linkState === 'offline') void reconnectNetwork()
                else void refreshNetwork()
              }}
            >
              <span
                className={`${styles.netDot} ${styles[`net_${networkStatus?.linkState ?? 'offline'}`]}`}
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
      <DiscoverModal open={discoverOpen} onClose={() => setDiscoverOpen(false)} />
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

import { useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  Dropdown,
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
  SunOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
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
import { LANPM_APP_VERSION } from '@shared/appVersion'
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
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)
  const networkStatus = useNetworkStore((s) => s.status)
  const refreshNetwork = useNetworkStore((s) => s.refresh)
  const reconnectNetwork = useNetworkStore((s) => s.reconnect)
  const connectManualPeer = useNetworkStore((s) => s.connectManualPeer)
  const networkLoading = useNetworkStore((s) => s.loading)
  const [manualPeerOpen, setManualPeerOpen] = useState(false)

  useEffect(() => {
    void refreshNetwork()
    const timer = setInterval(() => void refreshNetwork({ silent: true }), 8000)
    return () => clearInterval(timer)
  }, [refreshNetwork])

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
    const opts = groups.map((g) => ({
      value: g.groupId,
      label: (
        <span>
          {resolveGroupDisplayName(g, t)}{' '}
          <Text type="secondary" className={styles.groupType}>
            {t(GROUP_TYPE_KEYS[g.type])}
          </Text>
        </span>
      )
    }))
    if (isDmGroupId(activeGroupId) && !opts.some((o) => o.value === activeGroupId)) {
      const session = getDmSession(activeGroupId)
      const peerId = localUserId ? getDmPeerUserId(activeGroupId, localUserId) : null
      const name =
        session?.peerDisplayName ??
        (peerId ? getPeerDisplayName(activeGroupId, peerId) : activeGroupId)
      opts.unshift({
        value: activeGroupId,
        label: <span>{t('topbar.dmLabel', { name })}</span>
      })
    }
    return opts
  }, [groups, activeGroupId, localUserId, getDmSession, getPeerDisplayName, t])

  const userMenu: MenuProps['items'] = [
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
          <RegionButton variant="text" className={styles.logo} onClick={handleLogoClick}>
            <img
              src={logoUrl}
              alt={t('topbar.logoAlt')}
              className={styles.logoMark}
              width={24}
              height={24}
            />
            <span>{t('topbar.logo')}</span>
          </RegionButton>
          <Select
            className={styles.projectSelect}
            value={activeGroupId}
            onChange={handleGroupChange}
            options={groupSelectOptions}
          />
        </div>
        <span className={styles.barDivider} aria-hidden />
        <div className={styles.barGroup}>
          <RegionButton variant="pill" onClick={() => setDiscoverOpen(true)}>
            <CompassOutlined />
            {t('topbar.discover')}
          </RegionButton>
          <RegionButton variant="pill" onClick={() => setCreateOpen(true)}>
            <PlusOutlined />
            {t('topbar.createGroup')}
          </RegionButton>
          {canDissolveGroup ? (
            <RegionButton variant="pill" onClick={handleDissolveGroup}>
              <DeleteOutlined />
              {t('group.dissolve')}
            </RegionButton>
          ) : null}
          {!isCockpitRoute ? (
            <RegionButton variant="pill" onClick={() => navigate(cockpitPath())}>
              <DashboardOutlined />
              {t('topbar.cockpit')}
            </RegionButton>
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
        <GlobalSearch />
        <span className={styles.barDivider} aria-hidden />
        <div className={styles.barGroup}>
        <RegionButton
          variant="icon"
          aria-label={t('topbar.toggleTheme')}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
        </RegionButton>
        <Select
          className={styles.localeSelect}
          value={locale}
          onChange={(v) => setLocale(v)}
          options={[
            { value: 'zh-CN', label: t('topbar.localeZh') },
            { value: 'en-US', label: t('topbar.localeEn') }
          ]}
          suffixIcon={<GlobalOutlined />}
        />
        <Dropdown menu={{ items: userMenu }} trigger={['click']}>
          <RegionButton variant="user" aria-label={t('topbar.userMenu')}>
            <Avatar size="small" icon={<UserOutlined />} src={user?.avatarUrl ?? undefined} />
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

import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo, useState } from 'react'
import {
  Avatar,
  Button,
  Dropdown,
  Modal,
  Select,
  Space,
  Typography,
  type MenuProps
} from 'antd'
import {
  DashboardOutlined,
  GlobalOutlined,
  MoonOutlined,
  PlusOutlined,
  SunOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { isDmGroupId, getDmPeerUserId } from '@shared/chat/dmSession'
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import type { AppView, GroupType } from '@shared/navigation/types'
import { cockpitPath, groupViewPath } from '@renderer/routes/paths'
import CreateGroupModal from '@renderer/features/groups/CreateGroupModal'
import ProfileModal from '@renderer/features/profile/ProfileModal'
import { useDmStore } from '@renderer/stores/dmStore'
import { resolveGroupDisplayName } from '@renderer/i18n/groupLabels'
import GlobalSearch from '@renderer/layout/GlobalSearch'
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
  const { t } = useI18n()
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const createGroup = useNavigationStore((s) => s.createGroup)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const lastNonCockpitPath = useNavigationStore((s) => s.lastNonCockpitPath)
  const [createOpen, setCreateOpen] = useState(false)
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

  const handleLogoClick = (): void => {
    if (location.pathname.startsWith('/cockpit')) {
      navigate(lastNonCockpitPath ?? groupViewPath(activeGroupId, 'chat'))
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
      Modal.confirm({
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
    { type: 'divider' },
    {
      key: 'api',
      label: t('topbar.apiKey'),
      onClick: () => navigate(cockpitPath(), { state: { openAiConfig: true } })
    }
  ]

  return (
    <header className={styles.bar}>
      <Space size="middle" align="center">
        <button type="button" className={styles.logo} onClick={handleLogoClick}>
          <img
            src={logoUrl}
            alt={t('topbar.logoAlt')}
            className={styles.logoMark}
            width={24}
            height={24}
          />
          <span>{t('topbar.logo')}</span>
        </button>
        <Select
          className={styles.projectSelect}
          value={activeGroupId}
          onChange={handleGroupChange}
          options={groupSelectOptions}
        />
        <Button type="text" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          {t('topbar.createGroup')}
        </Button>
        <Button
          type="text"
          icon={<DashboardOutlined />}
          onClick={() => navigate(cockpitPath())}
        >
          {t('topbar.cockpit')}
        </Button>
      </Space>

      <Space size="middle" align="center">
        <GlobalSearch />
        <Button
          type="text"
          aria-label={t('topbar.toggleTheme')}
          icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggleTheme}
        />
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
          <button
            type="button"
            className={styles.userBtn}
            aria-label={t('topbar.userMenu')}
          >
            <Avatar size="small" icon={<UserOutlined />} src={user?.avatarUrl ?? undefined} />
            <span className={styles.userName}>{user?.displayName ?? t('topbar.userFallback')}</span>
          </button>
        </Dropdown>
      </Space>
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

import { useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Avatar,
  Button,
  Dropdown,
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
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import type { AppView, GroupType } from '@shared/navigation/types'
import { cockpitPath, groupViewPath } from '@renderer/routes/paths'
import CreateGroupModal from '@renderer/features/groups/CreateGroupModal'
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
  const [createOpen, setCreateOpen] = useState(false)
  const user = useIdentityStore((s) => s.user)
  const device = useIdentityStore((s) => s.device)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)

  const handleLogoClick = (): void => {
    navigate(groupViewPath(activeGroupId, 'chat'))
  }

  const handleGroupChange = (groupId: string): void => {
    const prevType = getGroupType(activeGroupId)
    if (prevType === 'anonymous' && activeGroupId !== groupId) {
      void getLanpmApi().group.leaveAnonymous(activeGroupId)
    }

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

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: t('topbar.profile'), disabled: true },
    {
      key: 'device',
      label: t('topbar.deviceWithName', { name: device?.deviceName ?? '—' })
    },
    { type: 'divider' },
    {
      key: 'api',
      label: t('topbar.apiKey'),
      onClick: () => navigate(cockpitPath())
    }
  ]

  return (
    <header className={styles.bar}>
      <Space size="middle" align="center">
        <button type="button" className={styles.logo} onClick={handleLogoClick}>
          <img src={logoUrl} alt="" className={styles.logoMark} width={24} height={24} />
          <span>{t('topbar.logo')}</span>
        </button>
        <Select
          className={styles.projectSelect}
          value={activeGroupId}
          onChange={handleGroupChange}
          options={groups.map((g) => ({
            value: g.groupId,
            label: (
              <span>
                {g.name}{' '}
                <Text type="secondary" className={styles.groupType}>
                  {t(GROUP_TYPE_KEYS[g.type])}
                </Text>
              </span>
            )
          }))}
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
          <button type="button" className={styles.userBtn}>
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
    </header>
  )
}

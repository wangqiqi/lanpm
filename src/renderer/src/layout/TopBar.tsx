import { useLocation, useNavigate } from 'react-router-dom'
import {
  Avatar,
  Button,
  Dropdown,
  Input,
  Select,
  Space,
  Typography,
  type MenuProps
} from 'antd'
import {
  DashboardOutlined,
  GlobalOutlined,
  MoonOutlined,
  SunOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import type { AppView, GroupType } from '@shared/navigation/types'
import { cockpitPath, groupViewPath } from '@renderer/routes/paths'
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
  const getGroupType = useNavigationStore((s) => s.getGroupType)
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
    setActiveGroupId(groupId)
    const raw = VIEW_PATH_RE.exec(location.pathname)?.[1]
    const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'files']
    let view: AppView = views.includes(raw as AppView) ? (raw as AppView) : 'chat'
    const type = getGroupType(groupId)
    if (!isViewAllowedForGroup(type, view)) {
      view = defaultViewForGroup(type)
    }
    navigate(groupViewPath(groupId, view))
  }

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: t('topbar.profile'), disabled: true },
    {
      key: 'device',
      label: `${t('topbar.device')}：${device?.deviceName ?? '—'}`
    },
    { type: 'divider' },
    { key: 'api', label: t('topbar.apiKey'), disabled: true }
  ]

  return (
    <header className={styles.bar}>
      <Space size="middle" align="center">
        <button type="button" className={styles.logo} onClick={handleLogoClick}>
          {t('topbar.logo')}
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
        <Button
          type="text"
          icon={<DashboardOutlined />}
          onClick={() => navigate(cockpitPath())}
        >
          {t('topbar.cockpit')}
        </Button>
      </Space>

      <Space size="middle" align="center">
        <Input.Search
          className={styles.search}
          placeholder={t('topbar.searchPlaceholder')}
          allowClear
          disabled
        />
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
            { value: 'zh-CN', label: '中文' },
            { value: 'en-US', label: 'English' }
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
    </header>
  )
}

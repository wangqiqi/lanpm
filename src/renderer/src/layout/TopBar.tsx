import { useNavigate } from 'react-router-dom'
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
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import type { AppView } from '@shared/navigation/types'
import { cockpitPath, groupViewPath } from '@renderer/routes/paths'
import styles from './TopBar.module.css'

const { Text } = Typography

const GROUP_TYPE_TAG: Record<string, string> = {
  project: '项目',
  function: '职能',
  anonymous: '匿名'
}

export default function TopBar(): React.ReactElement {
  const navigate = useNavigate()
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const user = useIdentityStore((s) => s.user)
  const theme = useUiStore((s) => s.theme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)
  const locale = useUiStore((s) => s.locale)
  const setLocale = useUiStore((s) => s.setLocale)

  const handleLogoClick = (): void => {
    navigate(groupViewPath(activeGroupId, 'chat'))
  }

  const getGroupType = useNavigationStore((s) => s.getGroupType)

  const handleGroupChange = (groupId: string): void => {
    setActiveGroupId(groupId)
    const viewMatch = window.location.pathname.match(/\/g\/[^/]+\/(\w+)/)
    const raw = viewMatch?.[1]
    const views: AppView[] = ['chat', 'board', 'tree', 'gantt', 'files']
    let view: AppView = views.includes(raw as AppView) ? (raw as AppView) : 'chat'
    const type = getGroupType(groupId)
    if (!isViewAllowedForGroup(type, view)) {
      view = defaultViewForGroup(type)
    }
    navigate(groupViewPath(groupId, view))
  }

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: '个人设置（占位）', disabled: true },
    { key: 'device', label: `设备：${useIdentityStore.getState().device?.deviceName ?? '—'}` },
    { type: 'divider' },
    { key: 'api', label: 'API Key（M5）', disabled: true }
  ]

  return (
    <header className={styles.bar}>
      <Space size="middle" align="center">
        <button type="button" className={styles.logo} onClick={handleLogoClick}>
          LanPM
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
                  {GROUP_TYPE_TAG[g.type]}
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
          驾驶舱
        </Button>
      </Space>

      <Space size="middle" align="center">
        <Input.Search
          className={styles.search}
          placeholder="搜索任务、消息…"
          allowClear
          disabled
        />
        <Button
          type="text"
          aria-label="切换主题"
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
            <span className={styles.userName}>{user?.displayName ?? '用户'}</span>
          </button>
        </Dropdown>
      </Space>
    </header>
  )
}

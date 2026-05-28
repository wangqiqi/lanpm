import { Outlet, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { defaultViewForGroup } from '@shared/navigation/tabRules'
import { groupViewPath } from '@renderer/routes/paths'
import { Layout, Typography, Tag, Space, Select } from 'antd'
import { useAppStore } from '@renderer/stores/appStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import BottomNav from './BottomNav'
import styles from './MainLayout.module.css'

const { Header, Content } = Layout
const { Title, Text } = Typography

const GROUP_TYPE_TAG: Record<string, { color: string; label: string }> = {
  project: { color: 'blue', label: '项目' },
  function: { color: 'purple', label: '职能' },
  anonymous: { color: 'default', label: '匿名' }
}

export default function MainLayout(): React.ReactElement {
  const navigate = useNavigate()
  const phase = useAppStore((s) => s.phase)
  const user = useIdentityStore((s) => s.user)
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const { groupId: routeGroupId } = useParams<{ groupId: string }>()

  useEffect(() => {
    if (routeGroupId && routeGroupId !== activeGroupId) {
      setActiveGroupId(routeGroupId)
    }
  }, [routeGroupId, activeGroupId, setActiveGroupId])

  const activeGroup = groups.find((g) => g.groupId === activeGroupId)
  const typeMeta = GROUP_TYPE_TAG[getGroupType(activeGroupId)] ?? GROUP_TYPE_TAG.project

  return (
    <Layout className={styles.shell}>
      <Header className={styles.header}>
        <Space align="center" wrap>
          <Title level={4} className={styles.title}>
            LanPM
          </Title>
          <Tag color="processing">{phase}</Tag>
          <Select
            className={styles.groupSelect}
            value={activeGroupId}
            options={groups.map((g) => ({
              value: g.groupId,
              label: `${g.name}（${GROUP_TYPE_TAG[g.type]?.label ?? g.type}）`
            }))}
            onChange={(id) => {
              setActiveGroupId(id)
              navigate(groupViewPath(id, defaultViewForGroup(getGroupType(id))))
            }}
            aria-label="切换群组（占位）"
          />
          {activeGroup && <Tag color={typeMeta.color}>{typeMeta.label}</Tag>}
          {user && <Tag>{user.displayName}</Tag>}
        </Space>
      </Header>
      <Content className={styles.content}>
        <Outlet />
      </Content>
      <BottomNav />
      <div className={styles.footer}>
        <Text type="secondary">M1 主框架 · 五视图路由（docs/05 §2）</Text>
      </div>
    </Layout>
  )
}

import { useEffect } from 'react'
import { Layout, Typography, Tag, Space, Spin } from 'antd'
import { useAppStore } from '@renderer/stores/appStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import SetupWizard from '@renderer/features/setup/SetupWizard'
import type { SetupStatus } from '@shared/identity'
import styles from './styles/App.module.css'

const { Header, Content, Footer } = Layout
const { Title, Text } = Typography

function MainShell(): React.ReactElement {
  const phase = useAppStore((s) => s.phase)
  const user = useIdentityStore((s) => s.user)
  const device = useIdentityStore((s) => s.device)

  return (
    <Layout className={styles.shell}>
      <Header className={styles.header}>
        <Space align="center">
          <Title level={4} className={styles.title}>
            LanPM
          </Title>
          <Tag color="processing">{phase}</Tag>
          {user && <Tag>{user.displayName}</Tag>}
        </Space>
      </Header>
      <Content className={styles.content}>
        <div className={styles.placeholder}>
          <Title level={3}>脚手架已就绪</Title>
          <Text type="secondary">
            Electron + React 18 + TypeScript + Ant Design 5 + Zustand
          </Text>
          {user && device && (
            <>
              <br />
              <Text type="secondary" className={styles.meta}>
                本机身份：{user.userId} · {device.deviceName}（{device.deviceId}）
              </Text>
            </>
          )}
          <br />
          <Text type="secondary" className={styles.meta}>
            下一步：NetworkStub 双实例互通（M0-09，见 todo.md）
          </Text>
        </div>
      </Content>
      <Footer className={styles.footer}>
        <Text type="secondary">M0 工程初始化 · 按 plan.md 执行</Text>
      </Footer>
    </Layout>
  )
}

export default function App(): React.ReactElement {
  const hydrated = useIdentityStore((s) => s.hydrated)
  const configured = useIdentityStore((s) => s.configured)
  const setFromStatus = useIdentityStore((s) => s.setFromStatus)
  const setHydrated = useIdentityStore((s) => s.setHydrated)

  useEffect(() => {
    let cancelled = false
    void window.lanpm.identity
      .getSetupStatus()
      .then((status) => {
        if (!cancelled) {
          setFromStatus(status.configured, status.user, status.device)
        }
      })
      .catch(() => {
        if (!cancelled) setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [setFromStatus, setHydrated])

  const handleSetupComplete = (status: SetupStatus): void => {
    setFromStatus(status.configured, status.user, status.device)
  }

  if (!hydrated) {
    return (
      <div className={styles.boot}>
        <Spin size="large" tip="正在加载…" />
      </div>
    )
  }

  if (!configured) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  return <MainShell />
}

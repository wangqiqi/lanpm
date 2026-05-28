import { Layout, Typography, Tag, Space } from 'antd'
import { useAppStore } from '@renderer/stores/appStore'
import styles from './styles/App.module.css'

const { Header, Content, Footer } = Layout
const { Title, Text } = Typography

export default function App(): React.ReactElement {
  const phase = useAppStore((s) => s.phase)

  return (
    <Layout className={styles.shell}>
      <Header className={styles.header}>
        <Space align="center">
          <Title level={4} className={styles.title}>
            LanPM
          </Title>
          <Tag color="processing">{phase}</Tag>
        </Space>
      </Header>
      <Content className={styles.content}>
        <div className={styles.placeholder}>
          <Title level={3}>脚手架已就绪</Title>
          <Text type="secondary">
            Electron + React 18 + TypeScript + Ant Design 5 + Zustand
          </Text>
          <br />
          <Text type="secondary" className={styles.meta}>
            下一步：M0 首次配置向导与 NetworkStub（见 todo.md）
          </Text>
        </div>
      </Content>
      <Footer className={styles.footer}>
        <Text type="secondary">M0 工程初始化 · 按 plan.md 执行</Text>
      </Footer>
    </Layout>
  )
}

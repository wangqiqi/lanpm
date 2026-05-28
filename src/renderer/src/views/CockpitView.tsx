import { Typography } from 'antd'
import styles from './CockpitView.module.css'

const { Title, Text } = Typography

export default function CockpitView(): React.ReactElement {
  return (
    <div className={styles.root}>
      <Title level={3}>驾驶舱</Title>
      <Text type="secondary">路由 /cockpit · M5 接入指标与报表</Text>
    </div>
  )
}

import { Typography } from 'antd'
import styles from './views.module.css'

export default function CockpitPlaceholder(): React.ReactElement {
  return (
    <div className={styles.placeholder}>
      <Typography.Title level={3}>驾驶舱</Typography.Title>
      <Typography.Text type="secondary">路由 `/cockpit` 占位（M5-03~04）</Typography.Text>
    </div>
  )
}

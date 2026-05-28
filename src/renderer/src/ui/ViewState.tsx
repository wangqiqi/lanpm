import { Spin, Typography } from 'antd'
import styles from './ViewState.module.css'

const { Text } = Typography

export function ViewLoadingCenter(): React.ReactElement {
  return (
    <div className={styles.center}>
      <Spin />
    </div>
  )
}

export function ViewEmptyHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className={styles.center}>
      <Text type="secondary" className={styles.empty}>
        {children}
      </Text>
    </div>
  )
}

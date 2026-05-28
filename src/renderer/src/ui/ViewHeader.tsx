import { Typography } from 'antd'
import styles from './ViewHeader.module.css'

const { Title } = Typography

interface ViewHeaderProps {
  title: string
  actions?: React.ReactNode
}

/** 群组内 / 驾驶舱统一页标题（level 4，docs/05） */
export default function ViewHeader({ title, actions }: ViewHeaderProps): React.ReactElement {
  return (
    <header className={styles.header}>
      <Title level={4} className={styles.title}>
        {title}
      </Title>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}

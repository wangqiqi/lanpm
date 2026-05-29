import { Typography } from 'antd'
import styles from './ViewHeader.module.css'

const { Title } = Typography

interface ViewHeaderProps {
  title: string
  actions?: React.ReactNode
  /** 任务类视图用大标题区，默认无底部分隔线 */
  showDivider?: boolean
}

/** 群组内 / 驾驶舱统一页标题（level 4，docs/05） */
export default function ViewHeader({
  title,
  actions,
  showDivider = false
}: ViewHeaderProps): React.ReactElement {
  return (
    <header className={[styles.header, showDivider ? styles.headerDivider : ''].filter(Boolean).join(' ')}>
      <Title level={4} className={styles.title}>
        {title}
      </Title>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}

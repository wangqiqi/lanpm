import { Typography } from 'antd'
import styles from './ViewHeader.module.css'

const { Title } = Typography

interface ViewHeaderProps {
  title: string
  actions?: React.ReactNode
  /** 任务类视图用大标题区，默认无底部分隔线 */
  showDivider?: boolean
}

/** 群组内任务视图 / 驾驶舱页标题（level 4，docs/04 §1.4）；聊天页不使用 */
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

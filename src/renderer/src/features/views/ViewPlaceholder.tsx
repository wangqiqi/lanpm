import { Typography } from 'antd'
import type { AppView } from '@shared/navigation/types'
import styles from './views.module.css'

const VIEW_TITLES: Record<AppView, string> = {
  chat: '聊天',
  board: '看板',
  tree: '任务树',
  gantt: '甘特图',
  files: '文件'
}

interface ViewPlaceholderProps {
  view: AppView
  groupId: string
  groupName?: string
}

export default function ViewPlaceholder({
  view,
  groupId,
  groupName
}: ViewPlaceholderProps): React.ReactElement {
  return (
    <div className={styles.placeholder}>
      <Typography.Title level={3}>{VIEW_TITLES[view]}</Typography.Title>
      <Typography.Text type="secondary">
        群组：{groupName ?? groupId} · 路由占位（M1-01）
      </Typography.Text>
      <Typography.Paragraph type="secondary" className={styles.hint}>
        业务模块将在 M2（聊天）/ M3（看板·任务树）/ M4（甘特·文件）接入。
      </Typography.Paragraph>
    </div>
  )
}

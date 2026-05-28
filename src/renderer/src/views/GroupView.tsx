import { Typography } from 'antd'
import { useParams } from 'react-router-dom'
import type { AppView } from '@shared/navigation/types'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import styles from './GroupView.module.css'

const { Title, Text } = Typography

const VIEW_LABELS: Record<AppView, string> = {
  chat: '聊天',
  board: '看板',
  tree: '任务树',
  gantt: '甘特图',
  files: '文件'
}

export default function GroupView({ view }: { view: AppView }): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const group = useNavigationStore((s) => s.groups.find((g) => g.groupId === groupId))

  return (
    <div className={styles.root}>
      <Title level={3}>{VIEW_LABELS[view]}</Title>
      <Text type="secondary">
        群组：{group?.name ?? groupId}（{group?.type ?? '—'}）
      </Text>
      <br />
      <Text type="secondary" className={styles.path}>
        路由 /g/{groupId}/{view} · M1 视图占位（M2+ 接入业务）
      </Text>
    </div>
  )
}

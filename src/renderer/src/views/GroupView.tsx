import { Typography } from 'antd'
import { useParams } from 'react-router-dom'
import { useEffect } from 'react'
import type { AppView } from '@shared/navigation/types'
import { formatDmTitle, getDmPeerUserId, isDmGroupId } from '@shared/chat/dmSession'
import ChatView from '@renderer/features/chat/ChatView'
import BoardView from '@renderer/features/board/BoardView'
import TaskTreeView from '@renderer/features/tree/TaskTreeView'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
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
  const getGroupLabel = useNavigationStore((s) => s.getGroupLabel)
  const getPeerDisplayName = useDmStore((s) => s.getPeerDisplayName)
  const touchSession = useDmStore((s) => s.touchSession)
  const localUserId = useIdentityStore((s) => s.user?.userId)

  useEffect(() => {
    if (groupId && isDmGroupId(groupId)) {
      touchSession(groupId)
    }
  }, [groupId, touchSession])

  const chatTitle = (() => {
    if (!groupId) return '—'
    if (isDmGroupId(groupId) && localUserId) {
      const peerId = getDmPeerUserId(groupId, localUserId)
      if (peerId) {
        return formatDmTitle(getPeerDisplayName(groupId, peerId))
      }
    }
    return group?.name ?? getGroupLabel(groupId)
  })()

  if (view === 'chat') {
    return (
      <div className={styles.root}>
        <Title level={4} className={styles.chatTitle}>
          {chatTitle}
        </Title>
        <div className={styles.chatBody}>
          <ChatView />
        </div>
      </div>
    )
  }

  if (view === 'board') {
    return (
      <div className={`${styles.root} ${styles.taskView}`}>
        <Title level={4} className={styles.viewTitle}>
          {VIEW_LABELS.board}
        </Title>
        <div className={styles.taskBody}>
          <BoardView />
        </div>
      </div>
    )
  }

  if (view === 'tree') {
    return (
      <div className={`${styles.root} ${styles.taskView}`}>
        <Title level={4} className={styles.viewTitle}>
          {VIEW_LABELS.tree}
        </Title>
        <div className={styles.taskBody}>
          <TaskTreeView />
        </div>
      </div>
    )
  }

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

import { lazy, Suspense, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { AppView } from '@shared/navigation/types'
import { getDmPeerUserId, isDmGroupId } from '@shared/chat/dmSession'
import { resolveGroupDisplayName, resolveGroupDisplayNameById } from '@renderer/i18n/groupLabels'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useIdentityStore } from '@renderer/stores/identityStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewHeader from '@renderer/ui/ViewHeader'
import { useI18n } from '@renderer/i18n/useI18n'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import styles from './GroupView.module.css'

const ChatView = lazy(() => import('@renderer/features/chat/ChatView'))
const BoardView = lazy(() => import('@renderer/features/board/BoardView'))
const TaskTreeView = lazy(() => import('@renderer/features/tree/TaskTreeView'))
const GanttView = lazy(() => import('@renderer/features/gantt/GanttView'))
const FilesView = lazy(() => import('@renderer/features/files/FilesView'))

/** 聊天页标题为群名/DM 名；任务类视图为模块名（docs/05 §1.1） */
export default function GroupView({ view }: { view: AppView }): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const group = useNavigationStore((s) => s.groups.find((g) => g.groupId === groupId))
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const getPeerDisplayName = useDmStore((s) => s.getPeerDisplayName)
  const touchSession = useDmStore((s) => s.touchSession)
  const localUserId = useIdentityStore((s) => s.user?.userId)

  useEffect(() => {
    if (groupId && isDmGroupId(groupId)) {
      touchSession(groupId)
    }
  }, [groupId, touchSession])

  const anonymousHintShown = useRef<string | null>(null)

  useEffect(() => {
    if (!groupId || isDmGroupId(groupId)) return
    if (getGroupType(groupId) !== 'anonymous') return
    void getLanpmApi().group.enterAnonymous(groupId)
    if (anonymousHintShown.current !== groupId) {
      anonymousHintShown.current = groupId
      message.info(t('group.anonymousHint'))
    }
    return () => {
      void getLanpmApi().group.leaveAnonymous(groupId)
    }
  }, [groupId, getGroupType, t, message])

  const chatTitle = (() => {
    if (!groupId) return '—'
    if (isDmGroupId(groupId) && localUserId) {
      const peerId = getDmPeerUserId(groupId, localUserId)
      if (peerId) {
        return t('topbar.dmLabel', { name: getPeerDisplayName(groupId, peerId) })
      }
    }
    if (group) return resolveGroupDisplayName(group, t)
    return resolveGroupDisplayNameById(groupId, groupId, t)
  })()

  const pageTitle = view === 'chat' ? chatTitle : t(VIEW_MESSAGE_KEYS[view])
  const isChat = view === 'chat'

  return (
    <div className={`${styles.root} ${isChat ? '' : styles.taskView}`}>
      <ViewHeader title={pageTitle} />
      <div className={isChat ? styles.chatBody : styles.taskBody}>
        <Suspense fallback={<ViewLoadingCenter />}>
          {view === 'chat' && <ChatView />}
          {view === 'board' && <BoardView />}
          {view === 'tree' && <TaskTreeView />}
          {view === 'gantt' && <GanttView />}
          {view === 'files' && <FilesView />}
        </Suspense>
      </div>
    </div>
  )
}

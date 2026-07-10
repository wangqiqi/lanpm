import { useEffect, useRef } from 'react'
import { Alert } from 'antd'
import { useParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { AppView } from '@shared/navigation/types'
import { isDmGroupId } from '@shared/chat/dmSession'
import BoardView from '@renderer/features/board/BoardView'
import ChatView from '@renderer/features/chat/ChatView'
import FilesView from '@renderer/features/files/FilesView'
import GanttView from '@renderer/features/gantt/GanttView'
import TaskTreeView from '@renderer/features/tree/TaskTreeView'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import ViewHeader from '@renderer/ui/ViewHeader'
import { useI18n } from '@renderer/i18n/useI18n'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import { FUNCTION_GUIDE_STORAGE_KEY } from '@shared/navigation/guide'
import styles from './GroupView.module.css'

/** 聊天页群名仅 TopBar；任务类视图为模块名（docs/04 §1.4） */
export default function GroupView({ view }: { view: AppView }): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const touchSession = useDmStore((s) => s.touchSession)

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

  const isChat = view === 'chat'
  const pageTitle = isChat ? null : t(VIEW_MESSAGE_KEYS[view])
  const showFunctionGuide =
    groupId != null &&
    !isDmGroupId(groupId) &&
    getGroupType(groupId) === 'function' &&
    isChat &&
    !localStorage.getItem(FUNCTION_GUIDE_STORAGE_KEY)

  return (
    <div className={`${styles.root} ${isChat ? '' : styles.taskView}`}>
      {pageTitle != null ? <ViewHeader title={pageTitle} /> : null}
      {showFunctionGuide ? (
        <Alert
          type="info"
          showIcon
          closable
          className={styles.functionGuide}
          message={t('nav.functionGuideTitle')}
          description={t('nav.functionGuideBody')}
          onClose={() => localStorage.setItem(FUNCTION_GUIDE_STORAGE_KEY, '1')}
        />
      ) : null}
      <div className={isChat ? styles.chatBody : styles.taskBody}>
        {view === 'chat' && <ChatView />}
        {view === 'board' && <BoardView />}
        {view === 'tree' && <TaskTreeView />}
        {view === 'gantt' && <GanttView />}
        {view === 'files' && <FilesView />}
      </div>
    </div>
  )
}

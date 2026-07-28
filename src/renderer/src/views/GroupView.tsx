import { Suspense, lazy, useEffect, useRef } from 'react'
import { Alert, Spin } from 'antd'
import { useParams } from 'react-router-dom'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { AppView } from '@shared/navigation/types'
import { isDmGroupId } from '@shared/chat/dmSession'
import BoardView from '@renderer/features/board/BoardView'
import ChatView from '@renderer/features/chat/ChatView'
import FilesView from '@renderer/features/files/FilesView'
import TaskTreeView from '@renderer/features/tree/TaskTreeView'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useDmStore } from '@renderer/stores/dmStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import { FUNCTION_GUIDE_STORAGE_KEY } from '@shared/navigation/guide'
import styles from './GroupView.module.css'

const GanttView = lazy(() => import('@renderer/features/gantt/GanttView'))
const CalendarView = lazy(() => import('@renderer/features/calendar/CalendarView'))
const WhiteboardView = lazy(() => import('@renderer/features/whiteboard/WhiteboardView'))

function HeavyViewFallback(): React.ReactElement {
  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: 160 }}>
      <Spin />
    </div>
  )
}

/** 群级视图：群名 / 模块名由 TopBar 群切换器与底栏 Tab 承担，不重复 ViewHeader（docs/04 §1.4） */
export default function GroupView({ view }: { view: AppView }): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const { groupId } = useParams<{ groupId: string }>()
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const touchSession = useDmStore((s) => s.touchSession)
  const whiteboardZen = useUiStore((s) => s.whiteboardZen)

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
  const hideChrome = view === 'whiteboard' && whiteboardZen
  const showFunctionGuide =
    groupId != null &&
    !isDmGroupId(groupId) &&
    getGroupType(groupId) === 'function' &&
    isChat &&
    !localStorage.getItem(FUNCTION_GUIDE_STORAGE_KEY)

  return (
    <div
      className={`${styles.root} ${isChat ? '' : styles.taskView} ${hideChrome ? styles.zenRoot : ''}`}
    >
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
        <Suspense fallback={<HeavyViewFallback />}>
          {view === 'gantt' && <GanttView />}
          {view === 'calendar' && <CalendarView />}
          {view === 'whiteboard' && <WhiteboardView />}
        </Suspense>
        {view === 'files' && <FilesView />}
      </div>
    </div>
  )
}

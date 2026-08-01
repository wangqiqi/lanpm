import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Button, Drawer, Spin } from 'antd'
import { ExpandOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { contributedViewPath, groupViewPath } from '@renderer/routes/paths'
import { useI18n } from '@renderer/i18n/useI18n'
import { usePluginView } from '@renderer/plugin/usePluginView'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import {
  useChatCollaborationStore,
  type ChatCollaborationPanel
} from '@renderer/stores/chatCollaborationStore'
import styles from './chat.module.css'

const FilesView = lazy(() => import('@renderer/features/files/FilesView'))
const WhiteboardView = lazy(() => import('@renderer/features/whiteboard/WhiteboardView'))
const MindmapView = lazy(() => import('@renderer/plugin/builtins/MindmapView'))

const PANEL_WIDTH: Record<ChatCollaborationPanel, number | string> = {
  files: 720,
  whiteboard: '92vw',
  mindmap: '80vw'
}

function panelTitleKey(panel: ChatCollaborationPanel): 'nav.files' | 'nav.whiteboard' | 'nav.mindmap' {
  switch (panel) {
    case 'files':
      return 'nav.files'
    case 'whiteboard':
      return 'nav.whiteboard'
    case 'mindmap':
      return 'nav.mindmap'
  }
}

function PanelFallback(): React.ReactElement {
  return (
    <div className={styles.collaborationPanelLoading}>
      <Spin />
    </div>
  )
}

interface Props {
  groupId: string
}

export default function ChatCollaborationDrawer({ groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const navigate = useNavigate()
  const panel = useChatCollaborationStore((s) => s.panel)
  const close = useChatCollaborationStore((s) => s.close)
  const mindmapPlugin = usePluginView('lanpm.mindmap')

  const open = panel != null
  const width = panel ? PANEL_WIDTH[panel] : 720
  /** Excalidraw 须在抽屉动画结束且尺寸稳定后再挂载，否则指针与笔迹错位 */
  const [drawerReady, setDrawerReady] = useState(false)
  const showTallPanel = open && drawerReady && (panel === 'whiteboard' || panel === 'mindmap')

  useEffect(() => {
    if (panel) {
      document.documentElement.dataset.visualCollabDrawer = panel
    } else {
      delete document.documentElement.dataset.visualCollabDrawer
    }
    return () => {
      delete document.documentElement.dataset.visualCollabDrawer
    }
  }, [panel])

  const mindmapLicensed = useMemo(
    () => (mindmapPlugin ? isPluginLicenseActive(mindmapPlugin) : false),
    [mindmapPlugin]
  )

  const openFullscreen = (): void => {
    if (!panel) return
    if (panel === 'mindmap') {
      navigate(contributedViewPath(groupId, 'mindmap'))
    } else {
      navigate(groupViewPath(groupId, panel))
    }
    close()
  }

  const renderBody = (): React.ReactElement | null => {
    if (!panel) return null
    if (panel === 'files') {
      return (
        <Suspense fallback={<PanelFallback />}>
          <div className={styles.collaborationPanelBody}>
            <FilesView />
          </div>
        </Suspense>
      )
    }
    if (panel === 'whiteboard') {
      if (!showTallPanel) return <PanelFallback />
      return (
        <Suspense fallback={<PanelFallback />}>
          <div
            className={`${styles.collaborationPanelBody} ${styles.collaborationPanelTall} ${styles.collaborationPanelCanvas}`}
          >
            <WhiteboardView embedded />
          </div>
        </Suspense>
      )
    }
    if (!mindmapPlugin) {
      return <PanelFallback />
    }
    if (!showTallPanel) return <PanelFallback />
    return (
      <Suspense fallback={<PanelFallback />}>
        <div
          className={`${styles.collaborationPanelBody} ${styles.collaborationPanelTall} ${styles.collaborationPanelCanvas}`}
        >
          <MindmapView plugin={mindmapPlugin} groupId={groupId} embedded />
        </div>
      </Suspense>
    )
  }

  return (
    <Drawer
      open={open}
      width={width}
      destroyOnClose={false}
      className={styles.collaborationDrawer}
      title={panel ? t(panelTitleKey(panel)) : ''}
      onClose={close}
      afterOpenChange={(visible) => {
        setDrawerReady(visible)
      }}
      styles={{
        wrapper: panel === 'whiteboard' ? { transform: 'none' } : undefined
      }}
      extra={
        panel ? (
          <Button
            type="link"
            icon={<ExpandOutlined />}
            onClick={openFullscreen}
            disabled={panel === 'mindmap' && !mindmapLicensed}
          >
            {t('chat.collaborationFullscreen')}
          </Button>
        ) : null
      }
    >
      {renderBody()}
    </Drawer>
  )
}

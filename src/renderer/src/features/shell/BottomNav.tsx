import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CommentOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  FolderOutlined
} from '@ant-design/icons'
import { Tooltip } from 'antd'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import type { AppView } from '@shared/navigation/types'
import { groupViewPath, VIEW_TABS } from '@renderer/routes/paths'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import styles from './BottomNav.module.css'

const ICONS: Record<string, React.ReactNode> = {
  chat: <CommentOutlined />,
  board: <ProjectOutlined />,
  tree: <ApartmentOutlined />,
  gantt: <BarChartOutlined />,
  files: <FolderOutlined />
}

const LABELS: Record<string, string> = {
  'nav.chat': '聊天',
  'nav.board': '看板',
  'nav.tree': '任务树',
  'nav.gantt': '甘特图',
  'nav.files': '文件'
}

function activeViewFromPath(pathname: string): AppView | null {
  const m = /^\/g\/[^/]+\/([^/]+)/.exec(pathname)
  if (!m) return null
  return m[1] as AppView
}

export default function BottomNav(): React.ReactElement {
  const location = useLocation()
  const navigate = useNavigate()
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const getGroupType = useNavigationStore((s) => s.getGroupType)

  const groupType = getGroupType(activeGroupId)
  const currentView = activeViewFromPath(location.pathname)

  const tabs = useMemo(() => {
    return VIEW_TABS.map((tab) => ({
      view: tab.view,
      labelKey: tab.labelKey,
      icon: tab.icon,
      allowed: isViewAllowedForGroup(groupType, tab.view),
      path: groupViewPath(activeGroupId, tab.view)
    }))
  }, [activeGroupId, groupType])

  return (
    <nav className={styles.nav} aria-label="主视图导航">
      {tabs.map((tab) => {
        const active = currentView === tab.view
        const disabled = !tab.allowed
        const label = LABELS[tab.labelKey] ?? tab.view

        const btn = (
          <button
            key={tab.view}
            type="button"
            className={`${styles.tab} ${active ? styles.tabActive : ''} ${disabled ? styles.tabDisabled : ''}`}
            disabled={disabled}
            aria-current={active ? 'page' : undefined}
            onClick={() => {
              if (!disabled) navigate(tab.path)
            }}
          >
            <span className={styles.icon}>{ICONS[tab.icon]}</span>
            <span className={styles.label}>{label}</span>
          </button>
        )

        if (disabled) {
          return (
            <Tooltip key={tab.view} title="仅项目群组支持此视图">
              <span className={styles.tabWrap}>{btn}</span>
            </Tooltip>
          )
        }
        return btn
      })}
    </nav>
  )
}

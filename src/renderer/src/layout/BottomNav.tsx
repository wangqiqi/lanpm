import { useMemo } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Tooltip } from 'antd'
import {
  CommentOutlined,
  ProjectOutlined,
  ApartmentOutlined,
  BarChartOutlined,
  FolderOutlined
} from '@ant-design/icons'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import type { AppView, GroupType } from '@shared/navigation/types'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath, VIEW_TABS } from '@renderer/routes/paths'
import styles from './BottomNav.module.css'

const VIEW_ICONS: Record<AppView, React.ReactNode> = {
  chat: <CommentOutlined />,
  board: <ProjectOutlined />,
  tree: <ApartmentOutlined />,
  gantt: <BarChartOutlined />,
  files: <FolderOutlined />
}

const VIEW_LABELS: Record<AppView, string> = {
  chat: '聊天',
  board: '看板',
  tree: '任务树',
  gantt: '甘特图',
  files: '文件'
}

function disabledHint(type: GroupType): string {
  if (type === 'anonymous') return '匿名群仅支持聊天'
  if (type === 'function') return '职能群仅支持聊天与文件'
  return '仅项目群组支持'
}

export default function BottomNav(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const getGroupType = useNavigationStore((s) => s.getGroupType)

  const activeView = useMemo((): AppView | null => {
    const m = location.pathname.match(/\/g\/[^/]+\/(\w+)/)
    const v = m?.[1]
    if (v === 'chat' || v === 'board' || v === 'tree' || v === 'gantt' || v === 'files') {
      return v
    }
    return null
  }, [location.pathname])

  if (!groupId) return <></>

  const groupType = getGroupType(groupId)

  return (
    <nav className={styles.nav} aria-label="主视图导航">
      {VIEW_TABS.map((tab) => {
        const allowed = isViewAllowedForGroup(groupType, tab.view)
        const active = activeView === tab.view
        const btn = (
          <button
            type="button"
            className={`${styles.tab} ${active ? styles.tabActive : ''} ${!allowed ? styles.tabDisabled : ''}`}
            disabled={!allowed}
            onClick={() => {
              if (allowed) navigate(groupViewPath(groupId, tab.view))
            }}
          >
            <span className={styles.icon}>{VIEW_ICONS[tab.view]}</span>
            <span className={styles.label}>{VIEW_LABELS[tab.view]}</span>
          </button>
        )
        return allowed ? (
          <span key={tab.view} className={styles.tabWrap}>
            {btn}
          </span>
        ) : (
          <Tooltip key={tab.view} title={disabledHint(groupType)}>
            <span className={styles.tabWrap}>{btn}</span>
          </Tooltip>
        )
      })}
    </nav>
  )
}

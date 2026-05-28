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
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/messages'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
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

const DISABLED_HINT_KEYS: Record<GroupType, MessageKey> = {
  project: 'nav.disabled.project',
  function: 'nav.disabled.function',
  anonymous: 'nav.disabled.anonymous'
}

export default function BottomNav(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()
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
    <nav className={styles.nav} aria-label={t('nav.ariaLabel')}>
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
            <span className={styles.label}>{t(VIEW_MESSAGE_KEYS[tab.view])}</span>
          </button>
        )
        return allowed ? (
          <span key={tab.view} className={styles.tabWrap}>
            {btn}
          </span>
        ) : (
          <Tooltip key={tab.view} title={t(DISABLED_HINT_KEYS[groupType])}>
            <span className={styles.tabWrap}>{btn}</span>
          </Tooltip>
        )
      })}
    </nav>
  )
}

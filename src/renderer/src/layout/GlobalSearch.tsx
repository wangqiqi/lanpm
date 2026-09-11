import { useCallback, useMemo, useState } from 'react'
import { AutoComplete, Typography } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { FileTextOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@renderer/i18n/useI18n'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import type { GlobalSearchHit } from '@shared/search/types'
import { isViewAllowedForGroup } from '@shared/navigation/tabRules'
import type { AppView, GroupType } from '@shared/navigation/types'
import { groupViewPath } from '@renderer/routes/paths'
import { VIEW_MESSAGE_KEYS } from '@renderer/i18n/navKeys'
import { resolveGroupDisplayNameById } from '@renderer/i18n/groupLabels'
import styles from './GlobalSearch.module.css'

const { Text } = Typography

interface SearchOption {
  value: string
  label: React.ReactNode
  hit: GlobalSearchHit
}

function destinationViewForHit(
  hit: GlobalSearchHit,
  getGroupType: (groupId: string) => GroupType
): AppView {
  const type = getGroupType(hit.groupId)
  if (hit.kind === 'task') {
    return isViewAllowedForGroup(type, 'board', hit.groupId) ? 'board' : 'tree'
  }
  if (hit.kind === 'message') {
    return 'chat'
  }
  return 'chat'
}

interface GlobalSearchProps {
  className?: string
}

export default function GlobalSearch({ className }: GlobalSearchProps): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const navigate = useNavigate()
  const setActiveGroupId = useNavigationStore((s) => s.setActiveGroupId)
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<SearchOption[]>([])
  const [loading, setLoading] = useState(false)

  const runSearch = useCallback(async (text: string) => {
    const q = text.trim()
    setQuery(text)
    if (q.length < 1) {
      setOptions([])
      return
    }
    setLoading(true)
    try {
      const result = await getLanpmApi().search.query(q)
      setOptions(
        result.hits.map((hit) => {
          const destView = destinationViewForHit(hit, getGroupType)
          return {
            value:
              hit.kind === 'task'
                ? `task:${hit.taskId}`
                : hit.kind === 'message'
                  ? `msg:${hit.msgId}`
                  : `member:${hit.userId}:${hit.groupId}`,
            hit,
            label: (
              <div className={styles.option}>
                {hit.kind === 'task' ? (
                  <FileTextOutlined className={styles.optionIcon} />
                ) : hit.kind === 'message' ? (
                  <MessageOutlined className={styles.optionIcon} />
                ) : (
                  <UserOutlined className={styles.optionIcon} />
                )}
                <div className={styles.optionBody}>
                  <Text ellipsis className={styles.optionTitle}>
                    {hit.kind === 'task'
                      ? hit.title
                      : hit.kind === 'message'
                        ? hit.snippet
                        : hit.displayName}
                  </Text>
                  <Text type="secondary" className={styles.optionMeta}>
                    {hit.kind === 'task'
                      ? t('search.kindTask')
                      : hit.kind === 'message'
                        ? t('search.kindMessage')
                        : t('search.kindMember')}{' '}
                    · {resolveGroupDisplayNameById(hit.groupId, hit.groupName, t)} ·{' '}
                    {t('search.openInView', { view: t(VIEW_MESSAGE_KEYS[destView]) })}
                  </Text>
                </div>
              </div>
            )
          }
        })
      )
    } catch {
      setOptions([])
      message.error(t('search.failed'))
    } finally {
      setLoading(false)
    }
  }, [t, getGroupType, message])

  const debouncedSearch = useMemo(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    return (text: string) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void runSearch(text), 280)
    }
  }, [runSearch])

  const navigateToHit = (hit: GlobalSearchHit): void => {
    setActiveGroupId(hit.groupId)
    const type = getGroupType(hit.groupId)
    if (hit.kind === 'task') {
      const view = isViewAllowedForGroup(type, 'board', hit.groupId) ? 'board' : 'tree'
      navigate(groupViewPath(hit.groupId, view), {
        state: { highlightTaskId: hit.taskId }
      })
    } else if (hit.kind === 'message') {
      navigate(groupViewPath(hit.groupId, 'chat'), {
        state: { highlightMsgId: hit.msgId }
      })
    } else {
      navigate(groupViewPath(hit.groupId, 'chat'), {
        state: { composeDraft: `@${hit.displayName} ` }
      })
    }
    setQuery('')
    setOptions([])
  }

  const openFirstHit = (): void => {
    const first = options[0]
    if (first) navigateToHit(first.hit)
  }

  const rootClass = [styles.root, className].filter(Boolean).join(' ')

  return (
    <AutoComplete
      className={rootClass}
      value={query}
      options={options}
      onSearch={debouncedSearch}
      onSelect={(_value, option) => navigateToHit((option as SearchOption).hit)}
      notFoundContent={query.trim() ? (loading ? t('search.loading') : t('search.empty')) : null}
    >
      <input
        className={styles.input}
        placeholder={t('topbar.searchPlaceholder')}
        aria-label={t('topbar.searchPlaceholder')}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && options.length > 0) {
            e.preventDefault()
            openFirstHit()
          }
        }}
      />
    </AutoComplete>
  )
}

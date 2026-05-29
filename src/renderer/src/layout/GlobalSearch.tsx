import { useCallback, useMemo, useState } from 'react'
import { AutoComplete, Typography, message } from 'antd'
import { FileTextOutlined, MessageOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@renderer/i18n/useI18n'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import type { GlobalSearchHit } from '@shared/search/types'
import { defaultViewForGroup, isViewAllowedForGroup } from '@shared/navigation/tabRules'
import { groupViewPath } from '@renderer/routes/paths'
import styles from './GlobalSearch.module.css'

const { Text } = Typography

interface SearchOption {
  value: string
  label: React.ReactNode
  hit: GlobalSearchHit
}

export default function GlobalSearch(): React.ReactElement {
  const { t } = useI18n()
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
        result.hits.map((hit) => ({
          value: hit.kind === 'task' ? `task:${hit.taskId}` : `msg:${hit.msgId}`,
          hit,
          label: (
            <div className={styles.option}>
              {hit.kind === 'task' ? (
                <FileTextOutlined className={styles.optionIcon} />
              ) : (
                <MessageOutlined className={styles.optionIcon} />
              )}
              <div className={styles.optionBody}>
                <Text ellipsis className={styles.optionTitle}>
                  {hit.kind === 'task' ? hit.title : hit.snippet}
                </Text>
                <Text type="secondary" className={styles.optionMeta}>
                  {hit.kind === 'task' ? t('search.kindTask') : t('search.kindMessage')} ·{' '}
                  {hit.groupName}
                </Text>
              </div>
            </div>
          )
        }))
      )
    } catch {
      setOptions([])
      message.error(t('search.failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

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
    } else {
      const view = defaultViewForGroup(type)
      navigate(groupViewPath(hit.groupId, view === 'chat' ? 'chat' : view), {
        state: { highlightMsgId: hit.msgId }
      })
    }
    setQuery('')
    setOptions([])
  }

  return (
    <AutoComplete
      className={styles.root}
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
      />
    </AutoComplete>
  )
}

import { useEffect, useRef } from 'react'
import type { MessageInstance } from 'antd/es/message/interface'
import { Navigate, useParams } from 'react-router-dom'
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import type { AppView } from '@shared/navigation/types'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath } from '@renderer/routes/paths'
import { useI18n } from '@renderer/i18n/useI18n'

export default function GroupViewGuard({
  view,
  children
}: {
  view: AppView
  children: React.ReactNode
}): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const messageRef = useRef<MessageInstance>(message)
  messageRef.current = message
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const warnedRef = useRef<string | null>(null)

  const type = groupId ? getGroupType(groupId) : 'project'
  const allowed = groupId ? isViewAllowedForGroup(type, view, groupId) : false
  const redirectView = defaultViewForGroup(type)

  useEffect(() => {
    if (!groupId || allowed) return
    const key = `${groupId}:${view}`
    if (warnedRef.current === key) return
    warnedRef.current = key
    messageRef.current.warning(t('nav.viewRedirected'))
  }, [groupId, allowed, view, t])

  if (!groupId) {
    return <Navigate to="/" replace />
  }

  if (!allowed) {
    return <Navigate to={groupViewPath(groupId, redirectView)} replace />
  }

  return <>{children}</>
}

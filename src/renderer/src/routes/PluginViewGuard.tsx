import { useEffect, useRef } from 'react'
import type { MessageInstance } from 'antd/es/message/interface'
import { Navigate, useParams } from 'react-router-dom'
import { defaultViewForGroup } from '@shared/navigation/tabRules'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath } from '@renderer/routes/paths'
import { useI18n } from '@renderer/i18n/useI18n'
import { useContributedViews } from '@renderer/plugin/useContributedViews'

export default function PluginViewGuard({
  route,
  children
}: {
  route: string
  children: React.ReactNode
}): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const messageRef = useRef<MessageInstance>(message)
  messageRef.current = message
  const getGroupType = useNavigationStore((s) => s.getGroupType)
  const contributedViews = useContributedViews()
  const warnedRef = useRef<string | null>(null)

  const contribution = contributedViews.find((v) => v.route === route) ?? null
  const type = groupId ? getGroupType(groupId) : 'project'
  const allowed = Boolean(
    groupId && contribution && contribution.groupTypes.includes(type)
  )
  const redirectView = groupId ? defaultViewForGroup(type) : 'chat'

  useEffect(() => {
    if (!groupId || allowed) return
    const key = `${groupId}:${route}`
    if (warnedRef.current === key) return
    warnedRef.current = key
    messageRef.current.warning(t('nav.viewRedirected'))
  }, [groupId, allowed, route, t])

  if (!groupId) {
    return <Navigate to="/" replace />
  }

  if (!contribution || !allowed) {
    return <Navigate to={groupViewPath(groupId, redirectView)} replace />
  }

  return <>{children}</>
}

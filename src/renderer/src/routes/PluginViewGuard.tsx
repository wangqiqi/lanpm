import { useEffect, useRef } from 'react'
import type { MessageInstance } from 'antd/es/message/interface'
import { Navigate, useParams } from 'react-router-dom'
import { defaultViewForGroup } from '@shared/navigation/tabRules'
import {
  firstVisibleViewForGroup,
  isContributedRouteVisible
} from '@shared/navigation/navPreferences'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useNavPreferencesStore } from '@renderer/stores/navPreferencesStore'
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
  const navPreferences = useNavPreferencesStore((s) => s.preferences)
  const contributedViews = useContributedViews()
  const warnedRef = useRef<string | null>(null)

  const contribution = contributedViews.find((v) => v.route === route) ?? null
  const type = groupId ? getGroupType(groupId) : 'project'
  const prefAllowed = isContributedRouteVisible(navPreferences, route)
  const ruleAllowed = Boolean(
    groupId && contribution && contribution.groupTypes.includes(type)
  )
  const allowed = ruleAllowed && prefAllowed
  const redirectView = groupId
    ? firstVisibleViewForGroup(type, navPreferences, groupId)
    : defaultViewForGroup(type)
  const hiddenByPreference = ruleAllowed && !prefAllowed

  useEffect(() => {
    if (!groupId || allowed) return
    const key = `${groupId}:${route}`
    if (warnedRef.current === key) return
    warnedRef.current = key
    messageRef.current.warning(
      t(hiddenByPreference ? 'nav.viewHiddenByPreference' : 'nav.viewRedirected')
    )
  }, [groupId, allowed, route, t, hiddenByPreference])

  if (!groupId) {
    return <Navigate to="/" replace />
  }

  if (!contribution || !allowed) {
    return <Navigate to={groupViewPath(groupId, redirectView)} replace />
  }

  return <>{children}</>
}

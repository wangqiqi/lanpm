import { Navigate, useParams } from 'react-router-dom'
import { isViewAllowedForGroup, defaultViewForGroup } from '@shared/navigation/tabRules'
import type { AppView } from '@shared/navigation/types'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath } from '@renderer/routes/paths'

export default function GroupViewGuard({
  view,
  children
}: {
  view: AppView
  children: React.ReactNode
}): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const getGroupType = useNavigationStore((s) => s.getGroupType)

  if (!groupId) {
    return <Navigate to="/" replace />
  }

  const type = getGroupType(groupId)
  if (!isViewAllowedForGroup(type, view, groupId)) {
    return (
      <Navigate to={groupViewPath(groupId, defaultViewForGroup(type))} replace />
    )
  }

  return <>{children}</>
}

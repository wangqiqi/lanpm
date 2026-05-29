import { Navigate } from 'react-router-dom'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath, pickDefaultGroupId } from '@renderer/routes/paths'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'

export default function HomeRedirect(): React.ReactElement {
  const groupsLoaded = useNavigationStore((s) => s.groupsLoaded)
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)

  if (!groupsLoaded) {
    return <ViewLoadingCenter />
  }

  const groupId = pickDefaultGroupId(groups, activeGroupId)
  return <Navigate to={groupViewPath(groupId, 'chat')} replace />
}

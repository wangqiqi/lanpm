import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { groupViewPath, pickDefaultGroupId } from '@renderer/routes/paths'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'

export default function HomeRedirect(): React.ReactElement {
  const navigate = useNavigate()
  const groupsLoaded = useNavigationStore((s) => s.groupsLoaded)
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!groupsLoaded && groups.length === 0) return
    if (redirectedRef.current) return
    redirectedRef.current = true
    const groupId = pickDefaultGroupId(groups, activeGroupId)
    navigate(groupViewPath(groupId, 'chat'), { replace: true })
  }, [groupsLoaded, groups, activeGroupId, navigate])

  if (!groupsLoaded && groups.length === 0) {
    return <ViewLoadingCenter />
  }

  return <ViewLoadingCenter />
}

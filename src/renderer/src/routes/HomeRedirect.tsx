import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNavigationStore } from '@renderer/stores/navigationStore'
import { useUiStore } from '@renderer/stores/uiStore'
import { defaultViewForGroup } from '@shared/navigation/tabRules'
import { cockpitPath, groupViewPath, pickDefaultGroupId } from '@renderer/routes/paths'
import { ViewLoadingCenter } from '@renderer/ui/ViewState'

export default function HomeRedirect(): React.ReactElement {
  const navigate = useNavigate()
  const groupsLoaded = useNavigationStore((s) => s.groupsLoaded)
  const groups = useNavigationStore((s) => s.groups)
  const activeGroupId = useNavigationStore((s) => s.activeGroupId)
  const redirectedRef = useRef(false)

  useEffect(() => {
    if (!groupsLoaded) return
    if (redirectedRef.current) return
    redirectedRef.current = true
    if (groups.length === 0) {
      useUiStore.getState().requestDiscoverOpen()
      navigate(cockpitPath(), { replace: true })
      return
    }
    const groupId = pickDefaultGroupId(groups, activeGroupId)
    const picked = groups.find((g) => g.groupId === groupId)
    navigate(groupViewPath(groupId, defaultViewForGroup(picked?.type ?? 'anonymous')), {
      replace: true
    })
  }, [groupsLoaded, groups, activeGroupId, navigate])

  if (!groupsLoaded) {
    return <ViewLoadingCenter />
  }

  return <ViewLoadingCenter />
}

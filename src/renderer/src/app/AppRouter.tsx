import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import MainLayout from '@renderer/layout/MainLayout'
import GroupViewGuard from '@renderer/routes/GroupViewGuard'
import PluginViewGuard from '@renderer/routes/PluginViewGuard'
import HomeRedirect from '@renderer/routes/HomeRedirect'
import CockpitView from '@renderer/views/CockpitView'
import GroupView from '@renderer/views/GroupView'
import PluginContributedView from '@renderer/views/PluginContributedView'
import type { AppView } from '@shared/navigation/types'
import { groupViewPath } from '@renderer/routes/paths'
import { useNavigationStore } from '@renderer/stores/navigationStore'

function GroupIndexRedirect(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  const resolveDefaultGroupId = useNavigationStore((s) => s.resolveDefaultGroupId)
  const gid = groupId ?? resolveDefaultGroupId()
  return <Navigate to={groupViewPath(gid, 'chat')} replace />
}

function viewRoute(view: AppView): React.ReactElement {
  return (
    <GroupViewGuard view={view}>
      <GroupView view={view} />
    </GroupViewGuard>
  )
}

function ContributedViewRoute(): React.ReactElement {
  const { contributedRoute } = useParams<{ contributedRoute: string }>()
  const route = contributedRoute ?? ''
  return (
    <PluginViewGuard route={route}>
      <PluginContributedView route={route} />
    </PluginViewGuard>
  )
}

export default function AppRouter(): React.ReactElement {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<MainLayout />}>
          <Route path="/cockpit" element={<CockpitView />} />
          <Route path="/g/:groupId" element={<GroupIndexRedirect />} />
          <Route path="/g/:groupId/chat" element={viewRoute('chat')} />
          <Route path="/g/:groupId/board" element={viewRoute('board')} />
          <Route path="/g/:groupId/tree" element={viewRoute('tree')} />
          <Route path="/g/:groupId/gantt" element={viewRoute('gantt')} />
          <Route path="/g/:groupId/calendar" element={viewRoute('calendar')} />
          <Route path="/g/:groupId/whiteboard" element={viewRoute('whiteboard')} />
          <Route path="/g/:groupId/files" element={viewRoute('files')} />
          <Route path="/g/:groupId/:contributedRoute" element={<ContributedViewRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

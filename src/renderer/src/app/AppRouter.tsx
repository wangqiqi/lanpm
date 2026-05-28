import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import MainLayout from '@renderer/layout/MainLayout'
import GroupViewGuard from '@renderer/routes/GroupViewGuard'
import GroupView from '@renderer/views/GroupView'
import CockpitView from '@renderer/views/CockpitView'
import { DEFAULT_GROUP_ID, groupViewPath } from '@renderer/routes/paths'
import type { AppView } from '@shared/navigation/types'

function GroupIndexRedirect(): React.ReactElement {
  const { groupId } = useParams<{ groupId: string }>()
  return <Navigate to={groupViewPath(groupId ?? DEFAULT_GROUP_ID, 'chat')} replace />
}

function viewRoute(view: AppView): React.ReactElement {
  return (
    <GroupViewGuard view={view}>
      <GroupView view={view} />
    </GroupViewGuard>
  )
}

export default function AppRouter(): React.ReactElement {
  return (
    <HashRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route
          path="/"
          element={<Navigate to={groupViewPath(DEFAULT_GROUP_ID, 'chat')} replace />}
        />
        <Route element={<MainLayout />}>
          <Route path="/cockpit" element={<CockpitView />} />
          <Route path="/g/:groupId" element={<GroupIndexRedirect />} />
          <Route path="/g/:groupId/chat" element={viewRoute('chat')} />
          <Route path="/g/:groupId/board" element={viewRoute('board')} />
          <Route path="/g/:groupId/tree" element={viewRoute('tree')} />
          <Route path="/g/:groupId/gantt" element={viewRoute('gantt')} />
          <Route path="/g/:groupId/files" element={viewRoute('files')} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  )
}

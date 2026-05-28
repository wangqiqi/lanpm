import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import MainLayout from '@renderer/features/shell/MainLayout'
import GroupViewOutlet from '@renderer/features/views/GroupViewOutlet'
import CockpitPlaceholder from '@renderer/features/views/CockpitPlaceholder'
import { DEFAULT_GROUP_ID, groupViewPath } from '@renderer/routes/paths'

function RootRedirect(): React.ReactElement {
  return <Navigate to={groupViewPath(DEFAULT_GROUP_ID, 'chat')} replace />
}

function ShellRoutes(): React.ReactElement {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/cockpit" element={<CockpitPlaceholder />} />
      <Route element={<MainLayout />}>
        <Route path="/g/:groupId/:view" element={<GroupViewOutlet />} />
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

export default function AppRouter(): React.ReactElement {
  return (
    <HashRouter>
      <ShellRoutes />
    </HashRouter>
  )
}

import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { Layout } from './components/Layout'
import { NotFoundPage } from './components/NotFoundPage'
import { LoginPage } from './features/auth/LoginPage'
import { TargetDetailPage } from './features/targets/TargetDetailPage'
import { AuditPage } from './features/audit/AuditPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { FindingDetailPage } from './features/findings/FindingDetailPage'
import { FindingsPage } from './features/findings/FindingsPage'
import { NewScanPage } from './features/scans/NewScanPage'
import { ScanDetailPage } from './features/scans/ScanDetailPage'
import { ScansPage } from './features/scans/ScansPage'
import { TargetsPage } from './features/targets/TargetsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="findings" element={<FindingsPage />} />
          <Route path="findings/:id" element={<FindingDetailPage />} />
          <Route path="targets" element={<TargetsPage />} />
          <Route path="scans" element={<ScansPage />} />
          <Route path="scans/new" element={<NewScanPage />} />
          <Route path="scans/:id" element={<ScanDetailPage />} />
          <Route path="targets/:id" element={<TargetDetailPage />} />
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="audit" element={<AuditPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

import { Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { Layout } from './components/Layout'
import { NotFoundPage } from './components/NotFoundPage'
import { LoginPage } from './features/auth/LoginPage'
import { Typography } from '@mui/material'
import { TargetDetailPage } from './features/targets/TargetDetailPage'
import { TargetsPage } from './features/targets/TargetsPage'

function Placeholder({ title }: { title: string }) {
  return <Typography variant="h5">{title}</Typography>
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route index element={<Placeholder title="Обзор" />} />
          <Route path="targets" element={<TargetsPage />} />
          <Route path="targets/:id" element={<TargetDetailPage />} />
          <Route element={<RequireRole role="ADMIN" />}>
            <Route path="audit" element={<Placeholder title="Аудит" />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

import { Outlet } from 'react-router-dom'
import type { Role } from '../api/types'
import { ForbiddenPage } from '../components/ForbiddenPage'
import { useAuth } from './AuthContext'

export function RequireRole({ role }: { role: Role }) {
  const { state } = useAuth()
  if (state.status !== 'authenticated' || state.user.role !== role) return <ForbiddenPage />
  return <Outlet />
}

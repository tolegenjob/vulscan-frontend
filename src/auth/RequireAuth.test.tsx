import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../tests/mocks/server'
import { renderWithProviders } from '../../tests/utils'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

function LoginProbe() {
  const location = useLocation()
  return <div>login page {location.search}</div>
}

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginProbe />} />
      <Route element={<RequireAuth />}>
        <Route path="/scans" element={<div>scans page</div>} />
        <Route element={<RequireRole role="ADMIN" />}>
          <Route path="/audit" element={<div>audit page</div>} />
        </Route>
      </Route>
    </Routes>
  )
}

const me = (role: 'USER' | 'ADMIN') => http.get(`${API}/auth/me`, () => HttpResponse.json({ id: '1', username: 'u', role }))

describe('RequireAuth', () => {
  it('redirects anonymous users to the login page keeping the target path', async () => {
    server.use(http.get(`${API}/auth/me`, () => HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401 })))
    renderWithProviders(<Tree />, { route: '/scans' })
    expect(await screen.findByText(/login page/)).toHaveTextContent('?next=%2Fscans')
  })

  it('renders the page for an authenticated user', async () => {
    server.use(me('USER'))
    renderWithProviders(<Tree />, { route: '/scans' })
    expect(await screen.findByText('scans page')).toBeInTheDocument()
  })

  it('shows no-access for a USER on an admin route', async () => {
    server.use(me('USER'))
    renderWithProviders(<Tree />, { route: '/audit' })
    expect(await screen.findByText('Нет доступа')).toBeInTheDocument()
    expect(screen.queryByText('audit page')).not.toBeInTheDocument()
  })

  it('lets an ADMIN into the admin route', async () => {
    server.use(me('ADMIN'))
    renderWithProviders(<Tree />, { route: '/audit' })
    expect(await screen.findByText('audit page')).toBeInTheDocument()
  })
})

import { useQuery } from '@tanstack/react-query'
import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../tests/mocks/server'
import { renderWithProviders } from '../../tests/utils'
import { api } from '../api/client'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireAuth } from './RequireAuth'

function ScansProbe() {
  const { data } = useQuery({ queryKey: ['scans'], queryFn: () => api.get<{ ok: boolean }>('/scans') })
  return <div>scans loaded {String(data?.ok)}</div>
}

describe('session expiry', () => {
  it('sends the user to the login page and remembers where they were', async () => {
    server.use(
      http.get(`${API}/auth/me`, () => HttpResponse.json({ id: '1', username: 'u', role: 'USER' })),
      http.get(`${API}/scans`, () => HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401 })),
    )
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/scans" element={<ScansProbe />} />
        </Route>
      </Routes>,
      { route: '/scans' },
    )
    expect(await screen.findByText('Сессия истекла. Войдите снова.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument()
  })
})

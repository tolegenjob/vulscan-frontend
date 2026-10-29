import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { renderWithProviders } from '../../../tests/utils'
import { RequireAuth } from '../../auth/RequireAuth'
import { RequireRole } from '../../auth/RequireRole'
import { AuditPage } from './AuditPage'

const event = (n: number) => ({
  id: `ev${n}`, actorId: 'u1', action: 'TARGET_CREATED', subjectType: 'TARGET', subjectId: `t${n}`,
  details: { name: 'Shop' }, createdAt: '2026-01-01T00:00:00Z',
})

function tree() {
  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<RequireRole role="ADMIN" />}>
          <Route path="/audit" element={<AuditPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
const me = (role: 'USER' | 'ADMIN') => http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 'u1', username: 'a', role }))

describe('AuditPage', () => {
  it('shows events for an admin and paginates', async () => {
    const pages: string[] = []
    server.use(
      me('ADMIN'),
      http.get(`${API}/audit-events`, ({ request }) => {
        const p = new URL(request.url).searchParams.get('page') ?? ''
        pages.push(p)
        return HttpResponse.json({ items: [event(Number(p) + 1)], page: Number(p), size: 50, total: 120 })
      }),
    )
    renderWithProviders(tree(), { route: '/audit' })
    const table = await screen.findByRole('table', { name: 'События аудита' })
    expect(table).toHaveTextContent('TARGET_CREATED')
    expect(table).toHaveTextContent('{"name":"Shop"}')
    await userEvent.click(screen.getByRole('button', { name: /next page|следующая/i }))
    await screen.findByText(/TARGET t2/)
    expect(pages).toEqual(['0', '1'])
  })

  it('is not available to ordinary users and does not call the API', async () => {
    server.use(me('USER'))
    renderWithProviders(tree(), { route: '/audit' }) // любой запрос /audit-events вызвал бы ошибку onUnhandledRequest
    expect(await screen.findByText('Нет доступа')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    server.use(me('ADMIN'), http.get(`${API}/audit-events`, () => HttpResponse.json({ items: [], page: 0, size: 50, total: 0 })))
    renderWithProviders(tree(), { route: '/audit' })
    expect(await screen.findByText('Событий нет')).toBeInTheDocument()
  })
})

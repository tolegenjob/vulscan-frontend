import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { target } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { ScansPage } from './ScansPage'

function Probe() {
  const l = useLocation()
  return <div data-testid="search">{l.search}</div>
}

describe('ScansPage', () => {
  it('changes page in the URL and in the request', async () => {
    const pages: string[] = []
    server.use(
      http.get(`${API}/targets`, () => HttpResponse.json({ items: [target()], page: 0, size: 100, total: 1 })),
      http.get(`${API}/scans`, ({ request }) => {
        const url = new URL(request.url)
        pages.push(url.searchParams.get('page') ?? '')
        const items = Array.from({ length: 20 }, (_, i) => ({
          id: `s${i}`, targetId: 't1', status: 'COMPLETED', createdAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:01:05Z',
        }))
        return HttpResponse.json({ items, page: Number(url.searchParams.get('page')), size: 20, total: 45 })
      }),
    )
    renderWithProviders(
      <>
        <Routes>
          <Route path="/scans" element={<ScansPage />} />
        </Routes>
        <Probe />
      </>,
      { route: '/scans', withAuth: false },
    )
    expect(await screen.findByRole('table', { name: 'Список сканирований' })).toBeInTheDocument()
    expect(screen.getAllByText('1 мин 5 с')).toHaveLength(20)
    await userEvent.click(screen.getByRole('button', { name: /next page|Go to next page|Следующая/i }))
    await screen.findByText(/21–40/)
    expect(screen.getByTestId('search')).toHaveTextContent('page=1')
    expect(pages).toEqual(['0', '1'])
  })

  it('shows an empty state', async () => {
    server.use(
      http.get(`${API}/targets`, () => HttpResponse.json({ items: [], page: 0, size: 100, total: 0 })),
      http.get(`${API}/scans`, () => HttpResponse.json({ items: [], page: 0, size: 20, total: 0 })),
    )
    renderWithProviders(<Routes><Route path="/scans" element={<ScansPage />} /></Routes>, { route: '/scans', withAuth: false })
    expect(await screen.findByText('Сканирований пока нет')).toBeInTheDocument()
  })
})

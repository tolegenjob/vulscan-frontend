import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { findingDetail } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { FindingDetailPage } from './FindingDetailPage'

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/findings/:id" element={<FindingDetailPage />} />
    </Routes>,
    { route: '/findings/f1', withAuth: false },
  )
}

describe('FindingDetailPage', () => {
  it('shows the finding, its evidence and navigation links', async () => {
    server.use(http.get(`${API}/findings/f1`, () => HttpResponse.json(findingDetail())))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Reflected XSS in q' })).toBeInTheDocument()
    expect(screen.getByText(/CWE-79/)).toBeInTheDocument()
    expect(screen.getByText('Значение параметра q отражается без экранирования.')).toBeInTheDocument()
    expect(screen.getByLabelText('Тело ответа')).toHaveTextContent('<p>hello MARK world</p>')
    expect(screen.getByRole('link', { name: 'Сканирование' })).toHaveAttribute('href', '/scans/s1')
    expect(screen.getByRole('link', { name: 'Цель' })).toHaveAttribute('href', '/targets/t1')
  })

  it('switches between Details and Recommendation tabs', async () => {
    server.use(http.get(`${API}/findings/f1`, () => HttpResponse.json(findingDetail())))
    renderPage()
    await userEvent.click(await screen.findByRole('tab', { name: 'Details' }))
    expect(screen.getByText(/"context": "HTML_TEXT"/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Recommendation' }))
    expect(screen.getByText('Экранируйте вывод.')).toBeInTheDocument()
  })

  it('marks a finding as false positive and offers Reopen afterwards', async () => {
    let status = 'OPEN'
    let sent: unknown
    server.use(
      http.get(`${API}/findings/f1`, () => HttpResponse.json(findingDetail({ triageStatus: status as 'OPEN' }))),
      http.patch(`${API}/findings/f1`, async ({ request }) => {
        sent = await request.json()
        status = 'FALSE_POSITIVE'
        return HttpResponse.json(findingDetail({ triageStatus: 'FALSE_POSITIVE' }))
      }),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'False positive' }))
    expect(await screen.findByText('Ложное срабатывание')).toBeInTheDocument()
    expect(sent).toEqual({ triageStatus: 'FALSE_POSITIVE' })
    expect(screen.getByRole('button', { name: 'Reopen' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fixed' })).not.toBeInTheDocument()
  })

  it('shows a dedicated page for a missing finding', async () => {
    server.use(http.get(`${API}/findings/f1`, () => HttpResponse.json({ code: 'NOT_FOUND', message: 'x' }, { status: 404 })))
    renderPage()
    expect(await screen.findByText('Finding не найден')).toBeInTheDocument()
  })

  it('renders hostile evidence from the API as text', async () => {
    server.use(
      http.get(`${API}/findings/f1`, () =>
        HttpResponse.json(findingDetail({ evidence: { response: { status: 200, bodyExcerpt: '<img src=x onerror=window.__pwned=1>' } } })),
      ),
    )
    renderPage()
    const body = await screen.findByLabelText('Тело ответа')
    expect(body).toHaveTextContent('<img src=x onerror=window.__pwned=1>')
    expect(document.querySelector('img')).toBeNull()
  })
})

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { job, scan, target } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { ScanDetailPage } from './ScanDetailPage'

function renderPage() {
  server.use(http.get(`${API}/targets/t1`, () => HttpResponse.json(target())))
  return renderWithProviders(
    <Routes>
      <Route path="/scans/:id" element={<ScanDetailPage />} />
    </Routes>,
    { route: '/scans/s1', withAuth: false },
  )
}

describe('ScanDetailPage', () => {
  it('polls while the scan is running and stops once it is completed', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/scans/s1`, () => {
        calls++
        return HttpResponse.json(
          calls < 2 ? scan() : scan({ status: 'COMPLETED', finishedAt: '2026-01-01T00:01:00Z', jobs: [job({ status: 'COMPLETED' })] }),
        )
      }),
    )
    renderPage()
    expect(await screen.findByText('Выполняется', { selector: '.MuiChip-label' })).toBeInTheDocument()
    expect(await screen.findByText('Завершено', { selector: '.MuiChip-label' }, { timeout: 5000 })).toBeInTheDocument()
    const afterDone = calls
    await new Promise((r) => setTimeout(r, 2600))
    expect(calls).toBe(afterDone)
  }, 15000)

  it('shows a banner for a partially completed scan', async () => {
    server.use(
      http.get(`${API}/scans/s1`, () =>
        HttpResponse.json(
          scan({
            status: 'PARTIALLY_COMPLETED',
            jobs: [
              job({ id: 'j1', moduleType: 'XSS', status: 'COMPLETED' }),
              job({ id: 'j2', moduleType: 'SQLI', status: 'FAILED', errorCode: 'QUEUE_TIMEOUT' }),
            ],
          }),
        ),
      ),
    )
    renderPage()
    const banner = await screen.findByText(/XSS завершён/)
    expect(banner).toHaveTextContent('SQL-инъекции — модуль недоступен')
    expect(banner).toHaveTextContent('Результаты завершённых модулей доступны ниже')
  })

  it('warns when job results are incomplete', async () => {
    server.use(
      http.get(`${API}/scans/s1`, () =>
        HttpResponse.json(scan({ status: 'COMPLETED', jobs: [job({ status: 'COMPLETED', resultIntegrity: 'INCOMPLETE' })] })),
      ),
    )
    renderPage()
    expect(await screen.findByText(/могут быть неполными/)).toBeInTheDocument()
  })

  it('cancels a running scan after confirmation and shows CANCELLING', async () => {
    let cancelled = false
    server.use(
      http.get(`${API}/scans/s1`, () => HttpResponse.json(scan({ status: cancelled ? 'CANCELLING' : 'RUNNING' }))),
      http.post(`${API}/scans/s1/cancel`, () => {
        cancelled = true
        return HttpResponse.json(scan({ status: 'CANCELLING', cancelRequested: true }))
      }),
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Отменить' }))
    expect(cancelled).toBe(false)
    await userEvent.click(await screen.findByRole('button', { name: 'Отменить сканирование' }))
    expect(await screen.findByText('Отменяется', { selector: '.MuiChip-label' })).toBeInTheDocument()
    expect(cancelled).toBe(true)
    expect(screen.queryByRole('button', { name: 'Отменить' })).not.toBeInTheDocument()
  })

  it('offers a rerun for a finished scan', async () => {
    server.use(
      http.get(`${API}/scans/s1`, () => HttpResponse.json(scan({ status: 'COMPLETED', jobs: [job({ status: 'COMPLETED' })] }))),
      http.post(`${API}/scans/s1/rerun`, () => HttpResponse.json(scan({ id: 's2', status: 'PENDING' }), { status: 202 })),
    )
    renderPage()
    expect(screen.queryByRole('button', { name: 'Повторить' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Повторить' }))
    await screen.findByText('Повторное сканирование запущено')
  })

  it('links to the findings of the scan', async () => {
    server.use(http.get(`${API}/scans/s1`, () => HttpResponse.json(scan({ status: 'COMPLETED', jobs: [job({ status: 'COMPLETED' })] }))))
    renderPage()
    const link = await screen.findByRole('link', { name: /Все находки этого сканирования \(3\)/ })
    expect(link).toHaveAttribute('href', '/findings?scanId=s1')
  })

  it('treats a missing scan as not found', async () => {
    server.use(http.get(`${API}/scans/s1`, () => HttpResponse.json({ code: 'NOT_FOUND', message: 'x' }, { status: 404 })))
    renderPage()
    expect(await screen.findByText('Сканирование не найдено')).toBeInTheDocument()
  })
})

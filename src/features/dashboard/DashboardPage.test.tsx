import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { summary } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { DashboardPage } from './DashboardPage'

const render = () => renderWithProviders(<DashboardPage />, { withAuth: false })

describe('DashboardPage', () => {
  it('shows tiles that match the API response', async () => {
    server.use(http.get(`${API}/dashboard/summary`, () => HttpResponse.json(summary())))
    render()
    expect(await screen.findByTestId('tile-CRITICAL')).toHaveTextContent('1')
    expect(screen.getByTestId('tile-HIGH')).toHaveTextContent('4')
    expect(screen.getByTestId('tile-MEDIUM')).toHaveTextContent('7')
    expect(screen.getByTestId('tile-LOW')).toHaveTextContent('2')
    expect(screen.getByTestId('tile-INFO')).toHaveTextContent('0')
    expect(screen.getByTestId('tile-active')).toHaveTextContent('2')
    expect(screen.getByTestId('tile-avg')).toHaveTextContent('1 мин 35 с')
  })

  it('also states the chart values as text', async () => {
    server.use(http.get(`${API}/dashboard/summary`, () => HttpResponse.json(summary())))
    render()
    expect(await screen.findByText(/Критический: 1 · Высокий: 4 · Средний: 7/)).toBeInTheDocument()
  })

  it('lists the recent scans', async () => {
    server.use(http.get(`${API}/dashboard/summary`, () => HttpResponse.json(summary())))
    render()
    const table = await screen.findByRole('table', { name: 'Последние сканирования' })
    expect(table).toHaveTextContent('Завершено')
  })

  it('shows an empty state without data', async () => {
    server.use(
      http.get(`${API}/dashboard/summary`, () =>
        HttpResponse.json(
          summary({
            openFindingsBySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
            recentScans: [],
            activeScans: 0,
            avgScanDurationSec: null,
          }),
        ),
      ),
    )
    render()
    expect(await screen.findByText(/Данных пока нет/)).toBeInTheDocument()
  })

  it('shows an error', async () => {
    server.use(http.get(`${API}/dashboard/summary`, () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))
    render()
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })
})

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '../tests/mocks/server'
import { endpoint, job, policy, scan, target } from '../tests/fixtures'
import { renderWithProviders } from '../tests/utils'
import { AppRoutes } from './routes'

describe('scan launch flow', () => {
  it('logs in, creates a scan, follows it to completion and reaches the findings link', async () => {
    let loggedIn = false
    let polls = 0
    server.use(
      http.get(`${API}/auth/me`, () =>
        loggedIn ? HttpResponse.json({ id: 'u1', username: 'alice', role: 'USER' }) : HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401 }),
      ),
      http.post(`${API}/auth/login`, () => {
        loggedIn = true
        return HttpResponse.json({ id: 'u1', username: 'alice', role: 'USER', csrfToken: 't' })
      }),
      http.get(`${API}/targets`, () => HttpResponse.json({ items: [target()], page: 0, size: 100, total: 1 })),
      http.get(`${API}/targets/t1`, () => HttpResponse.json(target())),
      http.get(`${API}/policies`, () => HttpResponse.json([policy()])),
      http.get(`${API}/targets/t1/endpoints`, () => HttpResponse.json([endpoint()])),
      http.get(`${API}/targets/t1/identities`, () => HttpResponse.json([])),
      http.get(`${API}/targets/t1/access-rules`, () => HttpResponse.json([])),
      http.post(`${API}/scans`, () => HttpResponse.json(scan({ status: 'PENDING', jobs: [job({ status: 'QUEUED' })] }), { status: 202 })),
      http.get(`${API}/scans/s1`, () => {
        polls++
        return HttpResponse.json(
          polls < 2 ? scan() : scan({ status: 'COMPLETED', finishedAt: '2026-01-01T00:01:00Z', jobs: [job({ status: 'COMPLETED' })] }),
        )
      }),
    )
    renderWithProviders(<AppRoutes />, { route: '/login?next=%2Fscans%2Fnew%3FtargetId%3Dt1' })

    await userEvent.type(await screen.findByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))

    await userEvent.click(await screen.findByRole('checkbox', { name: 'XSS' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все endpoints' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Я подтверждаю/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Запустить сканирование' }))

    await waitFor(() => expect(screen.getByTestId('scan-status')).toHaveTextContent('Выполняется'))
    await waitFor(() => expect(screen.getByTestId('scan-status')).toHaveTextContent('Завершено'), { timeout: 6000 })
    expect(screen.getByRole('link', { name: /Все находки этого сканирования/ })).toHaveAttribute('href', '/findings?scanId=s1')
  }, 20000)
})

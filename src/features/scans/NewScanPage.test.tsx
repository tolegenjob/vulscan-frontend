import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { endpoint, identity, policy, scan, target } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { NewScanPage } from './NewScanPage'

function setup(opts: { identities?: unknown[]; rules?: unknown[]; targets?: unknown[] } = {}) {
  server.use(
    http.get(`${API}/targets`, () => {
      const items = opts.targets ?? [target(), target({ id: 't2', name: 'Pending', status: 'PENDING_VERIFICATION' })]
      return HttpResponse.json({ items, page: 0, size: 100, total: items.length })
    }),
    http.get(`${API}/policies`, () => HttpResponse.json([policy()])),
    http.get(`${API}/targets/t1/endpoints`, () => HttpResponse.json([endpoint(), endpoint({ id: 'e2', url: 'https://shop.example.kz/search' })])),
    http.get(`${API}/targets/t1/identities`, () => HttpResponse.json(opts.identities ?? [identity(), identity({ id: 'i2', label: 'bob' })])),
    http.get(`${API}/targets/t1/access-rules`, () => HttpResponse.json(opts.rules ?? [{ id: 'r1' }])),
  )
  return renderWithProviders(
    <Routes>
      <Route path="/scans/new" element={<NewScanPage />} />
      <Route path="/scans/:id" element={<div>scan page</div>} />
    </Routes>,
    { route: '/scans/new?targetId=t1', withAuth: false },
  )
}

const submit = () => screen.getByRole('button', { name: 'Запустить сканирование' })

describe('NewScanPage', () => {
  it('does not allow choosing an unverified target', async () => {
    setup()
    await userEvent.click(await screen.findByRole('combobox', { name: 'Цель' }))
    const option = await screen.findByRole('option', { name: /Pending/ })
    expect(option).toHaveAttribute('aria-disabled', 'true')
    expect(option).toHaveTextContent('не подтверждена')
  })

  it('blocks IDOR when the target has fewer than two identities', async () => {
    setup({ identities: [identity()] })
    const idor = await screen.findByRole('checkbox', { name: 'IDOR' })
    await waitFor(() => expect(idor).toBeDisabled())
    expect(screen.getByText(/минимум две учётные записи/)).toBeInTheDocument()
  })

  it('blocks IDOR without access rules', async () => {
    setup({ rules: [] })
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'IDOR' })).toBeDisabled())
    expect(screen.getByText(/хотя бы одно правило доступа/)).toBeInTheDocument()
  })

  it('keeps the launch button disabled until the permission is confirmed', async () => {
    setup()
    await screen.findByRole('checkbox', { name: 'XSS' })
    expect(submit()).toBeDisabled()
    await userEvent.click(screen.getByRole('checkbox', { name: /Я подтверждаю/ }))
    expect(submit()).toBeEnabled()
  })

  it('shows the scope warning with the target address and policy limits', async () => {
    setup()
    expect(await screen.findByText(/Сканирование отправляет тестовые запросы на адрес/)).toHaveTextContent('https://shop.example.kz')
    expect(screen.getByText(/до 2000 запросов, 5 запросов\/с/)).toBeInTheDocument()
  })

  it('requires module and endpoints before sending', async () => {
    setup()
    await screen.findByRole('checkbox', { name: 'XSS' })
    await userEvent.click(screen.getByRole('checkbox', { name: /Я подтверждаю/ }))
    await userEvent.click(submit())
    expect(await screen.findByText('Выберите хотя бы один модуль')).toBeInTheDocument()
    expect(screen.getByText('Выберите хотя бы один endpoint')).toBeInTheDocument()
  })

  it('sends a payload matching the API contract and opens the scan', async () => {
    let body: Record<string, unknown> = {}
    server.use(
      http.post(`${API}/scans`, async ({ request }) => {
        body = (await request.json()) as typeof body
        return HttpResponse.json(scan({ id: 'new-scan' }), { status: 202 })
      }),
    )
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'XSS' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'SQL-инъекции' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Time-based SQLi' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все endpoints' }))
    await userEvent.type(screen.getByLabelText(/Исключить пути/), '/logout')
    await userEvent.click(screen.getByRole('checkbox', { name: /Я подтверждаю/ }))
    await userEvent.click(submit())

    expect(await screen.findByText('scan page')).toBeInTheDocument()
    expect(body).toEqual({
      targetId: 't1',
      policyId: 'p1',
      modules: ['XSS', 'SQLI'],
      endpointIds: ['e1', 'e2'],
      xss: { reflected: true, stored: false, allowStore: false },
      sqli: { errorBased: true, booleanBased: true, timeBased: true },
      excludePrefixes: ['/logout'],
    })
  })

  it('rejects exclude paths that do not start with a slash', async () => {
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'XSS' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все endpoints' }))
    await userEvent.type(screen.getByLabelText(/Исключить пути/), 'logout')
    await userEvent.click(screen.getByRole('checkbox', { name: /Я подтверждаю/ }))
    await userEvent.click(submit())
    expect(await screen.findByText(/должен начинаться с/)).toBeInTheDocument()
  })

  it('shows the active-scans limit message on 429', async () => {
    server.use(http.post(`${API}/scans`, () => HttpResponse.json({ code: 'TOO_MANY_ACTIVE_SCANS', message: 'x' }, { status: 429 })))
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'XSS' }))
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все endpoints' }))
    await userEvent.click(screen.getByRole('checkbox', { name: /Я подтверждаю/ }))
    await userEvent.click(submit())
    expect(await screen.findByText('Дождитесь завершения активных сканирований')).toBeInTheDocument()
  })

  it('shows the endpoint counter', async () => {
    setup()
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Выбрать все endpoints' }))
    expect(screen.getByTestId('endpoint-counter')).toHaveTextContent('Выбрано 2 из 200')
    expect(within(screen.getByRole('table', { name: 'Выбор endpoints' })).getAllByRole('checkbox')).toHaveLength(3)
  })
})

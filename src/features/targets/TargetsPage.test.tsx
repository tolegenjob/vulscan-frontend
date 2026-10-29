import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { target } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { TargetsPage } from './TargetsPage'

function Tree() {
  return (
    <Routes>
      <Route path="/targets" element={<TargetsPage />} />
      <Route path="/targets/:id" element={<div>target detail</div>} />
    </Routes>
  )
}

const page = (items = [target()]) => http.get(`${API}/targets`, () => HttpResponse.json({ items, page: 0, size: 20, total: items.length }))

describe('TargetsPage', () => {
  it('lists targets with status labels', async () => {
    server.use(page([target(), target({ id: 't2', name: 'Blog', status: 'PENDING_VERIFICATION' })]))
    renderWithProviders(<Tree />, { route: '/targets', withAuth: false })
    const table = await screen.findByRole('table', { name: 'Список целей' })
    expect(within(table).getByText('Shop')).toBeInTheDocument()
    expect(within(table).getByText('Подтверждена')).toBeInTheDocument()
    expect(within(table).getByText('Ожидает подтверждения')).toBeInTheDocument()
  })

  it('shows an empty state', async () => {
    server.use(page([]))
    renderWithProviders(<Tree />, { route: '/targets', withAuth: false })
    expect(await screen.findByText(/Целей пока нет/)).toBeInTheDocument()
  })

  it('shows an error with retry when loading fails', async () => {
    server.use(http.get(`${API}/targets`, () => HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 })))
    renderWithProviders(<Tree />, { route: '/targets', withAuth: false })
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('validates the base URL on the client', async () => {
    server.use(page([]))
    renderWithProviders(<Tree />, { route: '/targets', withAuth: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить цель' }))
    await userEvent.type(screen.getByLabelText('Название'), 'Shop')
    await userEvent.type(screen.getByLabelText('Адрес (base URL)'), 'ftp://x')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText(/должен начинаться с http/)).toBeInTheDocument()
  })

  it('creates a target and opens its page', async () => {
    let sent: unknown
    server.use(
      page([]),
      http.post(`${API}/targets`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(target({ id: 'new', status: 'PENDING_VERIFICATION' }), { status: 201 })
      }),
    )
    renderWithProviders(<Tree />, { route: '/targets', withAuth: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить цель' }))
    await userEvent.type(screen.getByLabelText('Название'), 'Shop')
    await userEvent.type(screen.getByLabelText('Адрес (base URL)'), 'https://shop.example.kz')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText('target detail')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Shop', baseUrl: 'https://shop.example.kz' })
  })

  it('explains SCOPE_VIOLATION for forbidden addresses', async () => {
    server.use(
      page([]),
      http.post(`${API}/targets`, () => HttpResponse.json({ code: 'SCOPE_VIOLATION', message: 'blocked' }, { status: 422 })),
    )
    renderWithProviders(<Tree />, { route: '/targets', withAuth: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить цель' }))
    await userEvent.type(screen.getByLabelText('Название'), 'Local')
    await userEvent.type(screen.getByLabelText('Адрес (base URL)'), 'http://127.0.0.1')
    await userEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(await screen.findByText(/запрещён политикой безопасности/)).toBeInTheDocument()
  })
})

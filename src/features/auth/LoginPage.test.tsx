import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { renderWithProviders } from '../../../tests/utils'
import { LoginPage, safeNext } from './LoginPage'

const anonymous = http.get(`${API}/auth/me`, () => HttpResponse.json({ code: 'UNAUTHENTICATED', message: 'x' }, { status: 401 }))

function Tree() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/scans" element={<div>scans page</div>} />
      <Route path="/" element={<div>home page</div>} />
    </Routes>
  )
}

describe('LoginPage', () => {
  it('shows validation errors for an empty form', async () => {
    server.use(anonymous)
    renderWithProviders(<Tree />, { route: '/login' })
    await userEvent.click(await screen.findByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Введите логин')).toBeInTheDocument()
    expect(screen.getByText('Введите пароль')).toBeInTheDocument()
  })

  it('logs in and goes to the requested page', async () => {
    server.use(
      anonymous,
      http.post(`${API}/auth/login`, () => HttpResponse.json({ id: '1', username: 'alice', role: 'USER', csrfToken: 't' })),
    )
    renderWithProviders(<Tree />, { route: '/login?next=%2Fscans' })
    await userEvent.type(await screen.findByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('scans page')).toBeInTheDocument()
  })

  it('shows a message and clears the password on BAD_CREDENTIALS', async () => {
    server.use(
      anonymous,
      http.post(`${API}/auth/login`, () => HttpResponse.json({ code: 'BAD_CREDENTIALS', message: 'bad' }, { status: 401 })),
    )
    renderWithProviders(<Tree />, { route: '/login' })
    await userEvent.type(await screen.findByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText('Неверный логин или пароль')).toBeInTheDocument()
    expect(screen.getByLabelText('Пароль')).toHaveValue('')
  })

  it('shows the retry delay on 429', async () => {
    server.use(
      anonymous,
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'x' }, { status: 429, headers: { 'Retry-After': '42' } }),
      ),
    )
    renderWithProviders(<Tree />, { route: '/login' })
    await userEvent.type(await screen.findByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'pw')
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }))
    expect(await screen.findByText(/Повторите через 42 с/)).toBeInTheDocument()
  })

  it('disables the button while submitting so the form cannot be sent twice', async () => {
    let calls = 0
    server.use(
      anonymous,
      http.post(`${API}/auth/login`, async () => {
        calls++
        await new Promise((r) => setTimeout(r, 300))
        return HttpResponse.json({ id: '1', username: 'alice', role: 'USER' })
      }),
    )
    renderWithProviders(<Tree />, { route: '/login' })
    await userEvent.type(await screen.findByLabelText('Логин'), 'alice')
    await userEvent.type(screen.getByLabelText('Пароль'), 'pw')
    const button = screen.getByRole('button', { name: 'Войти' })
    await userEvent.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    await userEvent.click(button)
    expect(await screen.findByText('home page')).toBeInTheDocument()
    expect(calls).toBe(1)
  })
})

describe('safeNext', () => {
  it('accepts only local paths', () => {
    expect(safeNext('/scans?page=1')).toBe('/scans?page=1')
    expect(safeNext('//evil.test')).toBe('/')
    expect(safeNext('https://evil.test')).toBe('/')
    expect(safeNext('/\\evil.test')).toBe('/')
    expect(safeNext(null)).toBe('/')
  })
})

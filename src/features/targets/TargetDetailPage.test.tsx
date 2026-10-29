import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { target } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { TargetDetailPage } from './TargetDetailPage'

const me = (role: 'USER' | 'ADMIN') => http.get(`${API}/auth/me`, () => HttpResponse.json({ id: 'u1', username: 'u', role }))
const empty = [
  http.get(`${API}/targets/t1/endpoints`, () => HttpResponse.json([])),
  http.get(`${API}/targets/t1/identities`, () => HttpResponse.json([])),
  http.get(`${API}/targets/t1/access-rules`, () => HttpResponse.json([])),
]
const pending = target({
  status: 'PENDING_VERIFICATION',
  verification: { method: 'FILE', path: '/.well-known/vulscan-verify.txt', expectedContent: 'vulscan-token-123' },
})

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/targets/:id" element={<TargetDetailPage />} />
      <Route path="/targets" element={<div>targets list</div>} />
    </Routes>,
    { route: '/targets/t1' },
  )
}

describe('TargetDetailPage', () => {
  it('shows the verification instructions for a pending target', async () => {
    server.use(me('USER'), http.get(`${API}/targets/t1`, () => HttpResponse.json(pending)), ...empty)
    renderPage()
    expect(await screen.findByTestId('verification-token')).toHaveTextContent('vulscan-token-123')
    expect(screen.getByText(/vulscan-verify.txt/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /админ/ })).not.toBeInTheDocument()
  })

  it('offers manual approval to admins only', async () => {
    server.use(me('ADMIN'), http.get(`${API}/targets/t1`, () => HttpResponse.json(pending)), ...empty)
    renderPage()
    expect(await screen.findByRole('button', { name: /Подтвердить вручную/ })).toBeInTheDocument()
  })

  it('explains a failed verification', async () => {
    server.use(
      me('USER'),
      http.get(`${API}/targets/t1`, () => HttpResponse.json(pending)),
      http.post(`${API}/targets/t1/verify`, () => HttpResponse.json({ code: 'VERIFICATION_FAILED', message: 'x' }, { status: 422 })),
      ...empty,
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Проверить' }))
    expect(await screen.findByText(/Файл подтверждения не найден/)).toBeInTheDocument()
  })

  it('treats a foreign target as not found', async () => {
    server.use(me('USER'), http.get(`${API}/targets/t1`, () => HttpResponse.json({ code: 'NOT_FOUND', message: 'Target not found' }, { status: 404 })))
    renderPage()
    expect(await screen.findByText('Цель не найдена')).toBeInTheDocument()
  })

  it('deletes after confirmation and returns to the list', async () => {
    server.use(
      me('USER'),
      http.get(`${API}/targets/t1`, () => HttpResponse.json(target())),
      http.delete(`${API}/targets/t1`, () => new HttpResponse(null, { status: 204 })),
      ...empty,
    )
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Удалить' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Удалить', hidden: false }))
    expect(await screen.findByText('targets list')).toBeInTheDocument()
  })
})

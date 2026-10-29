import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { endpoint } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { EndpointsTab } from './EndpointsTab'

const list = (items = [endpoint()]) => http.get(`${API}/targets/t1/endpoints`, () => HttpResponse.json(items))

function renderTab() {
  return renderWithProviders(<EndpointsTab targetId="t1" baseUrl="https://shop.example.kz" />, { withAuth: false })
}

async function openImport() {
  await userEvent.click(await screen.findByRole('button', { name: 'Импорт из OpenAPI' }))
  return screen.getByTestId('openapi-file') as HTMLInputElement
}

describe('EndpointsTab', () => {
  it('lists endpoints with their parameters', async () => {
    server.use(list())
    renderTab()
    expect(await screen.findByText('https://shop.example.kz/api/orders/1')).toBeInTheDocument()
    expect(screen.getByText('id (path)')).toBeInTheDocument()
  })

  it('shows SCOPE_VIOLATION on the URL field when adding a foreign URL', async () => {
    server.use(list([]), http.post(`${API}/targets/t1/endpoints`, () => HttpResponse.json({ code: 'SCOPE_VIOLATION', message: 'x' }, { status: 422 })))
    renderTab()
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить endpoint' }))
    await userEvent.type(screen.getByLabelText('URL'), 'https://evil.test/x')
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText(/выходит за пределы цели/)).toBeInTheDocument()
  })

  it('refuses an OpenAPI file over 2 MB without sending anything', async () => {
    server.use(list([])) // любой POST вызвал бы ошибку onUnhandledRequest
    renderTab()
    const input = await openImport()
    const big = new File(['{}'], 'big.json', { type: 'application/json' })
    Object.defineProperty(big, 'size', { value: 3 * 1024 * 1024 })
    await userEvent.upload(input, big)
    expect(await screen.findByText(/больше 2 МБ/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Импортировать' })).toBeDisabled()
  })

  it('rejects a file that is not JSON', async () => {
    server.use(list([]))
    renderTab()
    const input = await openImport()
    await userEvent.upload(input, new File(['openapi: 3.0.0'], 'api.json', { type: 'application/json' }))
    expect(await screen.findByText(/не является корректным JSON/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Импортировать' })).toBeDisabled()
  })

  it('imports a document and reports created and skipped operations', async () => {
    let body: { document?: { openapi?: string }; serverUrl?: string } = {}
    server.use(
      list([]),
      http.post(`${API}/targets/t1/endpoints/import-openapi`, async ({ request }) => {
        body = (await request.json()) as typeof body
        return HttpResponse.json({ created: 3, skipped: [{ path: '/admin', method: 'GET', reason: 'outside scope' }] })
      }),
    )
    renderTab()
    const input = await openImport()
    await userEvent.upload(input, new File([JSON.stringify({ openapi: '3.0.0', paths: {} })], 'api.json', { type: 'application/json' }))
    const submit = screen.getByRole('button', { name: 'Импортировать' })
    await waitFor(() => expect(submit).toBeEnabled())
    await userEvent.click(submit)
    expect(await screen.findByText(/Создано: 3/)).toBeInTheDocument()
    expect(screen.getByText(/GET \/admin — outside scope/)).toBeInTheDocument()
    expect(body.serverUrl).toBe('https://shop.example.kz')
    expect(body.document?.openapi).toBe('3.0.0')
  })

  it('asks for confirmation before deleting', async () => {
    let deleted = false
    server.use(
      list(),
      http.delete(`${API}/targets/t1/endpoints/e1`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderTab()
    await userEvent.click(await screen.findByRole('button', { name: /Удалить GET/ }))
    expect(deleted).toBe(false)
    await userEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    await screen.findByText('Endpoint удалён')
    expect(deleted).toBe(true)
  })
})


import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { identity, target } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { IdentitiesTab } from './IdentitiesTab'

const SECRET = 'S3cr3t-Passw0rd!'
const list = (items = [identity()]) => http.get(`${API}/targets/t1/identities`, () => HttpResponse.json(items))

describe('IdentitiesTab', () => {
  it('shows that a secret exists without revealing anything', async () => {
    server.use(list())
    renderWithProviders(<IdentitiesTab target={target()} />, { withAuth: false })
    expect(await screen.findByText('Сохранён')).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/./)).not.toBeInTheDocument()
  })

  it('validates required fields', async () => {
    server.use(list([]))
    renderWithProviders(<IdentitiesTab target={target()} />, { withAuth: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить учётную запись' }))
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('Введите название')).toBeInTheDocument()
    expect(screen.getByText('Введите роль')).toBeInTheDocument()
  })

  it('sends the secret once and never shows it again', async () => {
    let sent: { secret?: Record<string, string>; authConfig?: Record<string, string> } = {}
    let created = false
    server.use(
      http.get(`${API}/targets/t1/identities`, () =>
        HttpResponse.json(created ? [identity({ label: 'bob' })] : []),
      ),
      http.post(`${API}/targets/t1/identities`, async ({ request }) => {
        sent = (await request.json()) as typeof sent
        created = true
        return HttpResponse.json(identity({ label: 'bob' }), { status: 201 })
      }),
    )
    renderWithProviders(<IdentitiesTab target={target()} />, { withAuth: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить учётную запись' }))
    await userEvent.type(screen.getByLabelText('Название'), 'bob')
    await userEvent.type(screen.getByLabelText('Роль'), 'user')
    await userEvent.type(screen.getByLabelText('URL входа'), 'https://shop.example.kz/login')
    await userEvent.type(screen.getByLabelText('Имя поля логина'), 'u')
    await userEvent.type(screen.getByLabelText('Имя поля пароля'), 'p')
    await userEvent.type(screen.getByLabelText('Логин'), 'bob')
    const password = screen.getByLabelText('Пароль')
    expect(password).toHaveAttribute('type', 'password')
    await userEvent.type(password, SECRET)
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))

    await screen.findByText('Учётная запись сохранена. Секрет больше не отображается.')
    expect(sent.secret).toEqual({ username: 'bob', password: SECRET })
    expect(sent.authConfig).toMatchObject({ loginUrl: 'https://shop.example.kz/login' })
    expect(document.body.textContent).not.toContain(SECRET)

    // повторное открытие формы — поля пустые
    await userEvent.click(screen.getByRole('button', { name: 'Добавить учётную запись' }))
    expect(screen.getByLabelText('Пароль')).toHaveValue('')
    expect(screen.getByLabelText('Логин')).toHaveValue('')
  })

  it('clears the typed secret from the form when saving fails', async () => {
    server.use(
      list([]),
      http.post(`${API}/targets/t1/identities`, () => HttpResponse.json({ code: 'SCOPE_VIOLATION', message: 'x' }, { status: 422 })),
    )
    renderWithProviders(<IdentitiesTab target={target()} />, { withAuth: false })
    await userEvent.click(await screen.findByRole('button', { name: 'Добавить учётную запись' }))
    await userEvent.type(screen.getByLabelText('Название'), 'bob')
    await userEvent.type(screen.getByLabelText('Роль'), 'user')
    await userEvent.type(screen.getByLabelText('URL входа'), 'https://evil.test/login')
    await userEvent.type(screen.getByLabelText('Имя поля логина'), 'u')
    await userEvent.type(screen.getByLabelText('Имя поля пароля'), 'p')
    await userEvent.type(screen.getByLabelText('Логин'), 'bob')
    await userEvent.type(screen.getByLabelText('Пароль'), SECRET)
    await userEvent.click(screen.getByRole('button', { name: 'Сохранить' }))
    expect(await screen.findByText('URL входа выходит за пределы цели')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Пароль')).toHaveValue(''))
  })

  it('disables the login test until the target is verified', async () => {
    server.use(list())
    renderWithProviders(<IdentitiesTab target={target({ status: 'PENDING_VERIFICATION' })} />, { withAuth: false })
    expect(await screen.findByRole('button', { name: 'Проверить вход' })).toBeDisabled()
  })

  it('shows the login test result', async () => {
    server.use(
      list(),
      http.post(`${API}/targets/t1/identities/i1/test-login`, () => HttpResponse.json({ ok: true, detail: 'Вход выполнен (HTTP 200)' })),
    )
    renderWithProviders(<IdentitiesTab target={target()} />, { withAuth: false })
    const row = (await screen.findByText('alice')).closest('tr') as HTMLElement
    await userEvent.click(within(row).getByRole('button', { name: 'Проверить вход' }))
    expect(await screen.findByText('Вход выполнен (HTTP 200)')).toBeInTheDocument()
  })
})

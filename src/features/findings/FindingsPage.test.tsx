import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../../tests/mocks/server'
import { findingItem } from '../../../tests/fixtures'
import { renderWithProviders } from '../../../tests/utils'
import { FindingsPage } from './FindingsPage'

function Probe() {
  return <div data-testid="search">{useLocation().search}</div>
}

function setup(route = '/findings', total = 60, items = [findingItem(), findingItem({ id: 'f2', title: 'SQLi', severity: 'CRITICAL', moduleType: 'SQLI' })]) {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(`${API}/findings`, ({ request }) => {
      requests.push(new URL(request.url).searchParams)
      return HttpResponse.json({ items, page: 0, size: 25, total })
    }),
  )
  renderWithProviders(
    <>
      <Routes>
        <Route path="/findings" element={<FindingsPage />} />
      </Routes>
      <Probe />
    </>,
    { route, withAuth: false },
  )
  return requests
}

const search = () => screen.getByTestId('search').textContent ?? ''
async function pick(label: string, option: string) {
  await userEvent.click(await screen.findByRole('combobox', { name: label }))
  await userEvent.click(await screen.findByRole('option', { name: option }))
}

describe('FindingsPage', () => {
  it('lists findings with severity, verdict and links', async () => {
    setup()
    expect(await screen.findByRole('link', { name: 'Reflected XSS in q' })).toHaveAttribute('href', '/findings/f1')
    expect(screen.getAllByText('GET https://shop.example.kz/search?q=1')).toHaveLength(2)
    expect(screen.getAllByText('Подтверждено').length).toBeGreaterThan(0)
    expect(screen.getByText('Критический')).toBeInTheDocument()
  })

  it('reads filters from the URL and sends them to the API', async () => {
    const reqs = setup('/findings?scanId=abc&severity=HIGH&minConfidence=70&page=2&size=50&sort=url,asc')
    await screen.findByRole('table', { name: 'Список находок' })
    const last = reqs[reqs.length - 1]
    expect(Object.fromEntries(last)).toMatchObject({ scanId: 'abc', severity: 'HIGH', minConfidence: '70', page: '2', size: '50', sort: 'url,asc' })
  })

  it('ignores unknown values in the URL', async () => {
    const reqs = setup('/findings?severity=EVIL&size=7&page=-3')
    await screen.findByRole('table', { name: 'Список находок' })
    const last = reqs[reqs.length - 1]
    expect(last.get('severity')).toBeNull()
    expect(last.get('size')).toBe('25')
    expect(last.get('page')).toBe('0')
  })

  it.each([
    ['Модуль', 'SQLI', 'moduleType=SQLI'],
    ['Тип уязвимости', 'XSS_STORED', 'vulnType=XSS_STORED'],
    ['Серьёзность', 'Критический', 'severity=CRITICAL'],
    ['Вердикт', 'Вероятно', 'verdict=LIKELY'],
    ['Статус', 'Исправлено', 'triageStatus=FIXED'],
  ])('filter %s updates the query string', async (label, option, expected) => {
    setup()
    await screen.findByRole('table', { name: 'Список находок' })
    await pick(label, option)
    await waitFor(() => expect(search()).toContain(expected))
  })

  it('puts the search text into the URL after the debounce', async () => {
    setup()
    await userEvent.type(await screen.findByLabelText('Поиск'), 'login')
    await waitFor(() => expect(search()).toContain('q=login'), { timeout: 2000 })
  })

  it('maps the confidence slider to minConfidence', async () => {
    setup()
    fireEvent.change(await screen.findByRole('slider'), { target: { value: 50 } })
    await waitFor(() => expect(search()).toContain('minConfidence=50'))
  })

  it('resets the page when a filter changes', async () => {
    setup('/findings?page=2')
    await screen.findByRole('table', { name: 'Список находок' })
    await pick('Модуль', 'XSS')
    await waitFor(() => expect(search()).toContain('moduleType=XSS'))
    expect(search()).not.toContain('page=')
  })

  it('moves between pages', async () => {
    const reqs = setup()
    await screen.findByRole('table', { name: 'Список находок' })
    await userEvent.click(screen.getByRole('button', { name: /next page|следующая/i }))
    await waitFor(() => expect(search()).toContain('page=1'))
    await waitFor(() => expect(reqs.some((r) => r.get('page') === '1')).toBe(true))
  })

  it('changes sorting', async () => {
    setup()
    await screen.findByRole('table', { name: 'Список находок' })
    await pick('Сортировка', 'Серьёзность')
    await waitFor(() => expect(search()).toContain('sort=severity%2Cdesc'))
    await userEvent.click(screen.getByRole('button', { name: 'По убыванию' }))
    await waitFor(() => expect(search()).toContain('sort=severity%2Casc'))
  })

  it('clears the URL on reset', async () => {
    setup('/findings?severity=HIGH&moduleType=XSS&page=1&scanId=abc')
    await userEvent.click(await screen.findByRole('button', { name: 'Сбросить фильтры' }))
    await waitFor(() => expect(search()).toBe(''))
  })

  it('shows an empty state', async () => {
    setup('/findings', 0, [])
    expect(await screen.findByText('Ничего не найдено, измените фильтры')).toBeInTheDocument()
  })

  it('shows a hint for huge result sets', async () => {
    setup('/findings', 12_345)
    expect(await screen.findByText(/Уточните фильтры/)).toBeInTheDocument()
  })

  it('shows an error and retries', async () => {
    let fail = true
    server.use(
      http.get(`${API}/findings`, () =>
        fail ? HttpResponse.json({ code: 'INTERNAL', message: 'boom' }, { status: 500 }) : HttpResponse.json({ items: [findingItem()], page: 0, size: 25, total: 1 }),
      ),
    )
    renderWithProviders(<Routes><Route path="/findings" element={<FindingsPage />} /></Routes>, { route: '/findings', withAuth: false })
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
    fail = false
    await userEvent.click(screen.getByRole('button', { name: 'Повторить' }))
    expect(await screen.findByRole('link', { name: 'Reflected XSS in q' })).toBeInTheDocument()
  })
})

import { expect, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Общие шаги для E-3 (vulscan-infra/evaluation/scenarios/e2e.yaml) — зеркалит значения оттуда
 * (кросс-репо, поэтому копия, а не импорт; при правке одного файла нужно поправить и другой).
 *
 * Требует живой стенд (`infra/scripts/up.sh`), см. playwright.config.ts и tests/e2e/README.md.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const LAB_APP_OPENAPI_FIXTURE = path.join(__dirname, 'fixtures', 'lab-app-openapi.json')

export const LAB_APP_BASE_URL = process.env.E2E_LAB_APP_BASE_URL ?? 'http://lab-app:8080'

export function adminCredentials(): { username: string; password: string } {
  const password = process.env.E2E_ADMIN_PASSWORD
  if (!password) {
    throw new Error(
      'E2E_ADMIN_PASSWORD не задан — это SCANNER_BOOTSTRAP_ADMIN_PASSWORD из infra/.env поднятого стенда (infra/scripts/up.sh).',
    )
  }
  return { username: process.env.E2E_ADMIN_USER ?? 'admin', password }
}

export const LAB_IDENTITIES = {
  alice: { label: 'alice', role: 'USER', username: 'alice', password: 'alice-pass-1' },
  bob: { label: 'bob', role: 'USER', username: 'bob', password: 'bob-pass-1' },
} as const

export async function login(page: Page, username: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Логин').fill(username)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

/** Создаёт цель через UI и возвращает её id (из URL страницы цели, на которую ведёт успешное создание). */
export async function createTarget(page: Page, name: string, baseUrl: string): Promise<string> {
  await page.goto('/targets')
  await page.getByRole('button', { name: 'Добавить цель' }).click()
  await page.getByLabel('Название').fill(name)
  await page.getByLabel('Адрес (base URL)').fill(baseUrl)
  await page.getByRole('button', { name: 'Добавить' }).click()
  await expect(page).toHaveURL(/\/targets\/[^/]+$/, { timeout: 15_000 })
  const match = /\/targets\/([^/?]+)/.exec(page.url())
  if (!match) throw new Error(`Не удалось извлечь targetId из URL: ${page.url()}`)
  return match[1]
}

/** Подтверждение владения вручную администратором — без размещения verification-файла на lab-app (не предмет E-3). */
export async function approveTargetAsAdmin(page: Page) {
  await page.getByRole('button', { name: 'Подтвердить вручную (админ)' }).click()
  await expect(page.getByText('Подтверждена', { exact: true })).toBeVisible({ timeout: 15_000 })
}

/** Импортирует endpoints из fixtures/lab-app-openapi.json (XSS + SQLi + IDOR, 5 операций — см. e2e.yaml). */
export async function importEndpointsFromOpenApi(page: Page, serverUrl: string) {
  await page.getByRole('tab', { name: 'Endpoints' }).click()
  await page.getByRole('button', { name: 'Импорт из OpenAPI' }).click()
  await page.getByTestId('openapi-file').setInputFiles(LAB_APP_OPENAPI_FIXTURE)
  const serverUrlField = page.getByLabel('Адрес сервера (serverUrl)')
  await serverUrlField.fill('')
  await serverUrlField.fill(serverUrl)
  await page.getByRole('button', { name: 'Импортировать' }).click()
  await expect(page.getByText(/^Создано: \d+\. Пропущено: \d+\.$/)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Закрыть' }).click()
}

/** Учётная запись FORM_LOGIN (lab-app `/login`, поля `username`/`password` — см. AuthController). */
export async function addFormLoginIdentity(
  page: Page,
  opts: { label: string; role: string; loginUrl: string; username: string; password: string },
) {
  await page.getByRole('tab', { name: 'Учётные записи' }).click()
  await page.getByRole('button', { name: 'Добавить учётную запись' }).click()
  await page.getByLabel('Название').fill(opts.label)
  await page.getByLabel('Роль').fill(opts.role)
  // FORM_LOGIN — значение по умолчанию выпадающего списка "Способ авторизации", отдельно не выбираем.
  await page.getByLabel('URL входа').fill(opts.loginUrl)
  await page.getByLabel('Имя поля логина').fill('username')
  await page.getByLabel('Имя поля пароля').fill('password')
  await page.getByLabel('Логин').fill(opts.username)
  await page.getByLabel('Пароль').fill(opts.password)
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('Учётная запись сохранена. Секрет больше не отображается.')).toBeVisible({ timeout: 15_000 })
}

/** Правило доступа IDOR-01 (seed.sql): заказ 1001 принадлежит alice, bob не должен его видеть. */
export async function addOrderAccessRule(page: Page, opts: { ownerLabel: string; deniedLabel: string; idValue: string }) {
  await page.getByRole('tab', { name: 'Правила доступа' }).click()
  await page.getByRole('button', { name: 'Добавить правило' }).click()
  await page.getByLabel('Endpoint').click()
  await page.getByRole('option', { name: new RegExp(`^GET .*/api/orders/\\{id\\}$`) }).click()
  await page.getByLabel('Параметр-идентификатор').fill('id')
  // "Расположение" по умолчанию PATH — уже верно для /api/orders/{id}.
  await page.getByLabel('Значение').fill(opts.idValue)
  await page.getByLabel('Владелец объекта').click()
  await page.getByRole('option', { name: new RegExp(`^${opts.ownerLabel} \\(`) }).click()
  await page.getByLabel('Маркеры владельца в ответе').fill('$.content')
  await page.getByLabel(new RegExp(`^${opts.deniedLabel} \\(`)).click()
  await page.getByRole('option', { name: 'Запрещён' }).click()
  await page.getByRole('button', { name: 'Сохранить' }).click()
  await expect(page.getByText('Правило добавлено')).toBeVisible({ timeout: 15_000 })
}

/**
 * Запускает скан с текущей страницы цели (должна быть открыта `/targets/:id`).
 * Выбирает все модули из `modules`, все доступные endpoints, подтверждает ScopeWarning.
 */
export async function createScan(page: Page, targetId: string, modules: ReadonlyArray<'XSS' | 'SQLI' | 'IDOR'>) {
  await page.goto(`/scans/new?targetId=${targetId}`)
  for (const m of modules) {
    const label = m === 'XSS' ? 'XSS' : m === 'SQLI' ? 'SQL-инъекции' : 'IDOR'
    await page.getByRole('checkbox', { name: label }).check()
  }
  await page.getByRole('checkbox', { name: 'Выбрать все endpoints' }).check()
  await page.getByRole('checkbox', { name: 'Я подтверждаю, что имею разрешение на проверку этой системы' }).check()
  await page.getByRole('button', { name: 'Запустить сканирование' }).click()
  await expect(page).toHaveURL(/\/scans\/[^/]+$/, { timeout: 15_000 })
}

export async function waitForScanStatus(page: Page, label: string, timeoutMs: number) {
  await expect(page.getByTestId('scan-status')).toHaveText(label, { timeout: timeoutMs })
}

/** CSRF-токен из cookie `XSRF-TOKEN` (ставится Core при логине) — так же, как делает src/api/client.ts. */
async function csrfToken(page: Page): Promise<string> {
  const cookies = await page.context().cookies()
  const token = cookies.find((c) => c.name === 'XSRF-TOKEN')?.value
  if (!token) throw new Error('Cookie XSRF-TOKEN не найден — страница должна быть залогинена (см. login()).')
  return decodeURIComponent(token)
}

/**
 * Быстрая подготовка target+endpoint напрямую через API (без UI) — для сценариев, которые
 * проверяют поведение Core (лимиты, отмену), а не сам путь по экранам (это проверяет
 * full-journey.spec.ts). Требует, чтобы `page` уже было залогинено (login()).
 */
export async function apiCreateVerifiedTargetWithEndpoint(
  page: Page,
  opts: { name: string; baseUrl: string; endpointUrl: string; endpointParam: string },
): Promise<{ targetId: string; endpointId: string }> {
  const { targetId, endpointIds } = await apiCreateVerifiedTargetWithEndpoints(page, {
    name: opts.name,
    baseUrl: opts.baseUrl,
    endpoints: [{ url: opts.endpointUrl, param: opts.endpointParam }],
  })
  return { targetId, endpointId: endpointIds[0] }
}

/** Как apiCreateVerifiedTargetWithEndpoint, но сразу с несколькими GET+query-параметр endpoints. */
export async function apiCreateVerifiedTargetWithEndpoints(
  page: Page,
  opts: { name: string; baseUrl: string; endpoints: ReadonlyArray<{ url: string; param: string }> },
): Promise<{ targetId: string; endpointIds: string[] }> {
  const headers = { 'X-XSRF-TOKEN': await csrfToken(page), 'Content-Type': 'application/json' }
  const targetRes = await page.request.post('/api/v1/targets', {
    headers,
    data: { name: opts.name, baseUrl: opts.baseUrl },
  })
  // Намеренно без `expect(ok, await text())`: шаблонная строка со вторым аргументом вычисляется
  // всегда (даже при успехе), а .text() один раз потребляет тело ответа — после этого .json()
  // ниже получил бы уже пустой поток. Поэтому тело читаем только на пути ошибки.
  if (!targetRes.ok()) throw new Error(`POST /targets: ${targetRes.status()} ${await targetRes.text()}`)
  const target = (await targetRes.json()) as { id: string }

  await page.request.post(`/api/v1/targets/${target.id}/approve`, { headers, data: {} })

  const endpointIds: string[] = []
  for (const ep of opts.endpoints) {
    const endpointRes = await page.request.post(`/api/v1/targets/${target.id}/endpoints`, {
      headers,
      data: {
        method: 'GET',
        url: ep.url,
        idempotent: true,
        parameters: [{ name: ep.param, location: 'QUERY', sampleValue: 'e2e-probe' }],
      },
    })
    if (!endpointRes.ok()) throw new Error(`POST /endpoints: ${endpointRes.status()} ${await endpointRes.text()}`)
    endpointIds.push(((await endpointRes.json()) as { id: string }).id)
  }

  return { targetId: target.id, endpointIds }
}

export interface ApiScanResult {
  status: number
  code?: string
  id?: string
}

/** POST /scans напрямую через API — для проверки серверного лимита (parallel-scans.spec.ts). */
export async function apiCreateScan(page: Page, targetId: string, endpointId: string, modules: ReadonlyArray<'XSS' | 'SQLI' | 'IDOR'>): Promise<ApiScanResult> {
  const headers = { 'X-XSRF-TOKEN': await csrfToken(page), 'Content-Type': 'application/json' }
  const res = await page.request.post('/api/v1/scans', {
    headers,
    data: { targetId, modules, endpointIds: [endpointId] },
  })
  if (res.ok()) {
    const body = (await res.json()) as { id: string }
    return { status: res.status(), id: body.id }
  }
  const body = (await res.json().catch(() => ({}) as { code?: string })) as { code?: string }
  return { status: res.status(), code: body.code }
}

/** Отменяет сканирование через API и не падает, если оно уже завершилось (используется в уборке между тестами). */
export async function apiCancelScanBestEffort(page: Page, scanId: string) {
  const headers = { 'X-XSRF-TOKEN': await csrfToken(page) }
  await page.request.post(`/api/v1/scans/${scanId}/cancel`, { headers, data: {} }).catch(() => undefined)
}

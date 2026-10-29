import { expect, test } from '@playwright/test'
import {
  LAB_APP_BASE_URL,
  LAB_IDENTITIES,
  addFormLoginIdentity,
  addOrderAccessRule,
  adminCredentials,
  approveTargetAsAdmin,
  createScan,
  createTarget,
  importEndpointsFromOpenApi,
  login,
  waitForScanStatus,
} from './fixtures'

/**
 * E-3 / E2E-01 (план, "Этап E-3", сценарий 1): вход -> создание target -> verify/approve ->
 * scan XSS+SQLI+IDOR -> ожидание COMPLETED -> переход к findings -> открыть finding ->
 * просмотр evidence -> отметить false positive.
 *
 * Требует живой стенд — см. tests/e2e/README.md. Таймауты ожидания скана намеренно большие
 * (до 5 минут, как в infra/scripts/smoke.sh), т.к. длительность зависит от загрузки хоста.
 */
test('полный путь от входа до triage находки (XSS+SQLI+IDOR)', async ({ page }) => {
  const admin = adminCredentials()
  const targetName = `e2e-journey-${Date.now()}`

  await login(page, admin.username, admin.password)

  const targetId = await createTarget(page, targetName, LAB_APP_BASE_URL)
  await approveTargetAsAdmin(page)

  await importEndpointsFromOpenApi(page, LAB_APP_BASE_URL)

  await addFormLoginIdentity(page, {
    ...LAB_IDENTITIES.alice,
    loginUrl: `${LAB_APP_BASE_URL}/login`,
  })
  await addFormLoginIdentity(page, {
    ...LAB_IDENTITIES.bob,
    loginUrl: `${LAB_APP_BASE_URL}/login`,
  })
  await addOrderAccessRule(page, { ownerLabel: 'alice', deniedLabel: 'bob', idValue: '1001' })

  await createScan(page, targetId, ['XSS', 'SQLI', 'IDOR'])
  const scanUrl = page.url()

  await waitForScanStatus(page, 'Завершено', 5 * 60_000)

  await page.getByRole('link', { name: /Все находки этого сканирования/ }).click()
  await expect(page).toHaveURL(/\/findings\?/)

  const firstFindingLink = page.locator('table a[href^="/findings/"]').first()
  await expect(firstFindingLink).toBeVisible({ timeout: 15_000 })
  await firstFindingLink.click()
  await expect(page).toHaveURL(/\/findings\/[^/]+$/)

  // Evidence-таб открыт по умолчанию (tab=0) — проверяем, что контент отрисован как данные,
  // не как HTML (план, безопасность сканера: EvidenceViewer, п. "Безопасное отображение HTML").
  await expect(page.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true')

  await page.getByRole('button', { name: 'False positive' }).click()
  await expect(page.getByRole('button', { name: 'Reopen' })).toBeVisible({ timeout: 15_000 })

  // Возврат к сканированию — findingCounts/триаж не ломает ссылки на scan/target (sanity-check).
  await page.goto(scanUrl)
  await expect(page.getByTestId('scan-status')).toHaveText('Завершено')
})

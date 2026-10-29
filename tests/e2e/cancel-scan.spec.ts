import { expect, test } from '@playwright/test'
import { adminCredentials, apiCreateVerifiedTargetWithEndpoints, createScan, login } from './fixtures'

/**
 * E-3 / E2E-05 (план, "Этап E-3", сценарий 5): отмена сканирования во время RUNNING ->
 * CANCELLED <= 15 с.
 *
 * Target/endpoints готовятся через API (быстро и без лишних предпосылок IDOR), а сама отмена —
 * через UI (кнопка "Отменить" -> подтверждение в диалоге), т.к. это и есть проверяемое поведение.
 *
 * Несколько XSS-эндпоинтов на одном endpoint-URL с разными q (а не 1) — чтобы задание с большей
 * вероятностью всё ещё было RUNNING, когда тест успевает открыть страницу и нажать "Отменить";
 * если окажется, что скан завершается до нажатия (COMPLETED/FAILED раньше отмены), Core вернёт
 * SCAN_ALREADY_FINISHED — в этом случае тест осознанно падает, а не маскирует гонку retry.
 */
test('отмена RUNNING-сканирования завершается CANCELLED не дольше чем за 15 секунд', async ({ page }) => {
  const admin = adminCredentials()
  await login(page, admin.username, admin.password)

  const { targetId } = await apiCreateVerifiedTargetWithEndpoints(page, {
    name: `e2e-cancel-${Date.now()}`,
    baseUrl: 'http://lab-app:8080',
    endpoints: [
      { url: 'http://lab-app:8080/xss/reflect-text', param: 'q' },
      { url: 'http://lab-app:8080/xss/reflect-attr-dq', param: 'q' },
      { url: 'http://lab-app:8080/xss/reflect-attr-sq', param: 'q' },
      { url: 'http://lab-app:8080/xss/reflect-js-string', param: 'q' },
    ],
  })

  await createScan(page, targetId, ['XSS'])

  await page.getByRole('button', { name: 'Отменить' }).click()
  await page.getByRole('button', { name: 'Отменить сканирование' }).click()

  const startedAt = Date.now()
  await expect(page.getByTestId('scan-status')).toHaveText('Отменено', { timeout: 15_000 })
  const elapsedMs = Date.now() - startedAt
  expect(elapsedMs, 'отмена должна укладываться в 15 секунд (план, E-3.5)').toBeLessThanOrEqual(15_000)
})

import { expect, test } from '@playwright/test'
import { apiCancelScanBestEffort, apiCreateScan, apiCreateVerifiedTargetWithEndpoint, adminCredentials, login } from './fixtures'

/**
 * E-3 / E2E-02 (план, "Этап E-3", сценарий 2): параллельный запуск 2 сканов одним пользователем
 * -> третий отклоняется 429.
 *
 * `maxActiveScansPerUser` по умолчанию = 2 (vulscan-core-backend: ScannerProperties.limits,
 * см. evaluation/scenarios/e2e.yaml, limitations) — если `.env` стенда переопределяет это
 * значение, число "разрешённых" сканов ниже (`ALLOWED`) нужно поправить через
 * `E2E_MAX_ACTIVE_SCANS_PER_USER`.
 *
 * Используется API напрямую (page.request), а не клики по форме: сам тест — про поведение
 * Core при гонке запросов, а не про то, что отрисовывает NewScanPage (это покрывает
 * full-journey.spec.ts).
 */
test('третий параллельный скан того же пользователя отклоняется 429 TOO_MANY_ACTIVE_SCANS', async ({ page }) => {
  const allowed = Number(process.env.E2E_MAX_ACTIVE_SCANS_PER_USER ?? 2)
  const admin = adminCredentials()

  await login(page, admin.username, admin.password)

  const { targetId, endpointId } = await apiCreateVerifiedTargetWithEndpoint(page, {
    name: `e2e-parallel-${Date.now()}`,
    baseUrl: 'http://lab-app:8080',
    endpointUrl: 'http://lab-app:8080/xss/reflect-text',
    endpointParam: 'q',
  })

  const createdScanIds: string[] = []
  try {
    // `allowed` запросов почти одновременно — чтобы застать их все в активном статусе до того,
    // как первый успеет завершиться (XSS с одним endpoint обычно укладывается в секунды, поэтому
    // именно "почти одновременно", а не последовательно).
    const firstBatch = await Promise.all(
      Array.from({ length: allowed }, () => apiCreateScan(page, targetId, endpointId, ['XSS'])),
    )
    for (const r of firstBatch) {
      expect(r.status, `ожидался 201 в пределах лимита (${allowed}), получено ${r.status}`).toBe(201)
      if (r.id) createdScanIds.push(r.id)
    }

    const rejected = await apiCreateScan(page, targetId, endpointId, ['XSS'])
    expect(rejected.status).toBe(429)
    expect(rejected.code).toBe('TOO_MANY_ACTIVE_SCANS')
  } finally {
    // Уборка: не оставляем активные сканы висящими для следующих тестов в этом файле/прогоне.
    await Promise.all(createdScanIds.map((id) => apiCancelScanBestEffort(page, id)))
  }
})

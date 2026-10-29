import { defineConfig, devices } from '@playwright/test'

/**
 * Конфигурация Playwright для E-3 (сквозная проверка от UI до finding).
 *
 * Эти тесты — НЕ часть `npm test`/CI (см. .github/workflows/ci.yml): они требуют живого стенда,
 * поднятого `infra/scripts/up.sh` из `vulscan-infra` (Core, Kafka, модули, lab-app), а CI такого
 * стенда не поднимает. Запускаются вручную: `npm run test:e2e` (после `npx playwright install`
 * хотя бы раз) с переменными окружения ниже, указывающими на уже поднятый стенд.
 */
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8081'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  timeout: 120_000, // ожидание COMPLETED/findings занимает минуты, не секунды (план, E-3.4)
  expect: { timeout: 10_000 },
  fullyParallel: false, // сценарий parallel-scans.spec.ts сам управляет параллелизмом внутри себя
  workers: 1, // тесты делят один и тот же bootstrap-админ и lab-app — параллельные воркеры мешали бы друг другу
  forbidOnly: !!process.env.CI,
  retries: 0, // E-1.6: детерминизм/нестабильность фиксируется явно, а не прячется повтором
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})

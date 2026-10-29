# E-3 — сквозная проверка (Playwright)

Реализует план, "Этап E-3" (`vulscan-infra/evaluation/scenarios/e2e.yaml` — там же описаны
сценарии, тайминги и известные ограничения; значения identities/endpoints здесь — их зеркало).

**Эти тесты не входят в CI** (`.github/workflows/ci.yml` их не запускает): им нужен живой стенд
(`infra/scripts/up.sh` из `vulscan-infra` — Core, Kafka, три модуля, lab-app), а в CI такого
стенда нет. Браузеры Playwright по той же причине не скачиваются при обычном `npm install`
(`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` в CI, см. workflow) — для локального запуска один раз
нужно `npx playwright install chromium`.

## Запуск

```bash
# 1. Поднять стенд (в vulscan-infra):
cd ../vulscan-infra/infra && ./scripts/up.sh

# 2. Один раз — браузер для Playwright (в vulscan-frontend):
npx playwright install chromium

# 3. Переменные окружения и запуск:
E2E_BASE_URL=http://127.0.0.1:8081 \
E2E_ADMIN_USER=admin \
E2E_ADMIN_PASSWORD=<SCANNER_BOOTSTRAP_ADMIN_PASSWORD из infra/.env> \
npm run test:e2e
```

- `E2E_BASE_URL` — адрес фронтенда (nginx), по умолчанию `http://127.0.0.1:8081` (как в
  `infra/scripts/smoke.sh`, `FRONTEND_HOST_BIND`/`FRONTEND_HOST_PORT`).
- `E2E_ADMIN_USER` / `E2E_ADMIN_PASSWORD` — обязателен пароль (нет безопасного значения по
  умолчанию); остальное — `SCANNER_BOOTSTRAP_ADMIN_USER`/`SCANNER_BOOTSTRAP_ADMIN_PASSWORD` из
  `infra/.env`.
- `E2E_LAB_APP_BASE_URL` — адрес lab-app **изнутри сети `lab-net`**, не с хоста (Core сам
  обращается к цели по этому адресу) — по умолчанию `http://lab-app:8080`, совпадает с
  `docker-compose.lab.yml`.
- `E2E_MAX_ACTIVE_SCANS_PER_USER` — только для `parallel-scans.spec.ts`, если `.env` стенда
  переопределяет `maxActiveScansPerUser` (по умолчанию в Core — 2).

## Файлы

- `fixtures.ts` — общие шаги (логин, создание target/endpoints/identities/access rules через UI
  и через API, запуск скана, ожидание статуса).
- `fixtures/lab-app-openapi.json` — минимальный OpenAPI-документ (5 операций: XSS/SQLi/IDOR),
  используется в `full-journey.spec.ts` через диалог "Импорт из OpenAPI".
- `full-journey.spec.ts` (E2E-01) — план, сценарий 1: вход → target → verify/approve → scan
  XSS+SQLI+IDOR → COMPLETED → findings → finding → evidence → false positive.
- `parallel-scans.spec.ts` (E2E-02) — план, сценарий 2: 2 скана одного пользователя параллельно,
  третий — 429 `TOO_MANY_ACTIVE_SCANS`.
- `cancel-scan.spec.ts` (E2E-05) — план, сценарий 5: отмена во время `RUNNING` → `CANCELLED`
  ≤ 15 с.
- Сценарий 3 (R-1…R-4) — уже реализован в `vulscan-infra/infra/scripts/resilience/*.sh` (N-1),
  здесь не дублируется.
- Сценарий 4 (тайминги по 5 прогонам) — результаты вносятся в
  `vulscan-infra/evaluation/RESULTS.md`, раздел E-3, вручную по итогам реальных запусков.

## Известные ограничения

- Ни один из этих тестов не был прогнан вживую в среде разработки этой сессии — нет Docker
  (значит, нет стенда) и нет установленного браузера Playwright. Написаны и статически проверены
  по исходному коду страниц (`src/features/**`) и Core API (`vulscan-core-backend`), но не
  исполнялись.
- `full-journey.spec.ts` ожидает финальный статус скана `Завершено` (`COMPLETED`); если какой-то
  модуль закончится с ошибкой, реальный статус будет `PARTIALLY_COMPLETED` — тест в этом случае
  осознанно падает (а не слабеет до "любой терминальный статус"), т.к. "частично" для E-3 — сигнал
  разобраться, не ожидаемый исход.
- `cancel-scan.spec.ts`: если сканирование с 4 XSS-эндпоинтами успевает завершиться раньше, чем
  тест нажимает "Отменить" (гонка, зависит от загрузки хоста), Core вернёт
  `SCAN_ALREADY_FINISHED` и тест упадёт — это ожидаемо задокументированное ограничение, а не
  баг теста (см. комментарий в файле).
- `parallel-scans.spec.ts` жёстко предполагает `maxActiveScansPerUser=2` (значение по умолчанию);
  см. `E2E_MAX_ACTIVE_SCANS_PER_USER` выше, если `.env` стенда его меняет.

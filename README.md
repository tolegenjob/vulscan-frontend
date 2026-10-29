# VulScan Frontend

React + TypeScript + Vite. Пользовательский интерфейс платформы сканирования (Core Backend: `vulscan-core-backend`).

- `npm install`, `npm run dev` — разработка (прокси `/api` → `localhost:8080`)
- `npm run lint`, `npm test`, `npm run build` — проверки CI
- `npm run test:e2e` — сквозные Playwright-тесты (E-3, `tests/e2e/`); **не входят в CI**, требуют
  живой стенд (`vulscan-infra/infra/scripts/up.sh`) — см. `tests/e2e/README.md`
- Типы API: `src/api/types.ts` (повторяют DTO Core)
- Секреты и токены в `localStorage`/`sessionStorage` не хранятся (правило ESLint); evidence показывается только как текст

import type { Endpoint, Identity, Target } from '../src/api/types'

export const target = (over: Partial<Target> = {}): Target => ({
  id: 't1',
  ownerId: 'u1',
  name: 'Shop',
  baseUrl: 'https://shop.example.kz',
  status: 'VERIFIED',
  allowedHosts: [{ host: 'shop.example.kz', ports: [443] }],
  verification: null,
  verifiedAt: '2026-01-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
})

export const endpoint = (over: Partial<Endpoint> = {}): Endpoint => ({
  id: 'e1',
  method: 'GET',
  url: 'https://shop.example.kz/api/orders/1',
  parameters: [{ name: 'id', location: 'PATH', sampleValue: '1' }],
  idempotent: true,
  label: null,
  ...over,
})

export const identity = (over: Partial<Identity> = {}): Identity => ({
  id: 'i1',
  label: 'alice',
  role: 'user',
  authType: 'FORM_LOGIN',
  authConfig: { loginUrl: 'https://shop.example.kz/login', usernameField: 'u', passwordField: 'p' },
  hasSecret: true,
  ...over,
})

import type { Policy, Scan, ScanJob } from '../src/api/types'

export const job = (over: Partial<ScanJob> = {}): ScanJob => ({
  id: 'j1',
  moduleType: 'XSS',
  status: 'RUNNING',
  attempt: 1,
  requestsSent: 10,
  endpointsDone: 1,
  errorCode: null,
  errorMessage: null,
  resultIntegrity: 'OK',
  startedAt: '2026-01-01T00:00:00Z',
  finishedAt: null,
  ...over,
})

export const scan = (over: Partial<Scan> = {}): Scan => ({
  id: 's1',
  targetId: 't1',
  policyId: 'p1',
  status: 'RUNNING',
  cancelRequested: false,
  createdAt: '2026-01-01T00:00:00Z',
  finishedAt: null,
  jobs: [job()],
  findingCounts: { INFO: 0, LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 0 },
  ...over,
})

export const policy = (over: Partial<Policy> = {}): Policy => ({
  id: 'p1',
  name: 'NORMAL',
  limits: { maxRequests: 2000, requestsPerSecond: 5, maxConcurrency: 2, httpTimeoutMs: 10000, maxResponseBytes: 1048576, maxDurationSec: 900 },
  ...over,
})

import type { DashboardSummary, FindingDetail, FindingListItem } from '../src/api/types'

export const findingItem = (over: Partial<FindingListItem> = {}): FindingListItem => ({
  id: 'f1',
  scanId: 's1',
  targetId: 't1',
  moduleType: 'XSS',
  vulnType: 'XSS_REFLECTED',
  verdict: 'CONFIRMED',
  severity: 'HIGH',
  confidence: 90,
  method: 'GET',
  url: 'https://shop.example.kz/search?q=1',
  parameterName: 'q',
  endpointId: 'e1',
  title: 'Reflected XSS in q',
  triageStatus: 'OPEN',
  createdAt: '2026-01-01T00:00:00Z',
  ...over,
})

export const findingDetail = (over: Partial<FindingDetail> = {}): FindingDetail => ({
  ...findingItem(),
  jobId: 'j1',
  fingerprint: 'abc',
  parameterLocation: 'QUERY',
  summary: 'Значение параметра q отражается без экранирования.',
  recommendation: 'Экранируйте вывод.',
  cwe: 'CWE-79',
  details: { context: 'HTML_TEXT', payload: 'x' },
  evidence: {
    request: { method: 'GET', url: 'https://shop.example.kz/search?q=%3Cx%3E', headers: { Accept: '*/*' } },
    response: { status: 200, bodyExcerpt: '<p>hello MARK world</p>', highlights: [{ start: 9, end: 13 }] },
    observations: [{ key: 'reflected', value: 'true' }],
  },
  ...over,
})

export const summary = (over: Partial<DashboardSummary> = {}): DashboardSummary => ({
  openFindingsBySeverity: { CRITICAL: 1, HIGH: 4, MEDIUM: 7, LOW: 2, INFO: 0 },
  openFindingsByModule: { XSS: 8, SQLI: 4, IDOR: 2 },
  openFindingsByVerdict: { CONFIRMED: 9, LIKELY: 3, SUSPECTED: 2 },
  activeScans: 2,
  recentScans: [{ id: 's1', targetId: 't1', status: 'COMPLETED', createdAt: '2026-01-01T00:00:00Z', finishedAt: '2026-01-01T00:01:00Z' }],
  avgScanDurationSec: 95,
  ...over,
})

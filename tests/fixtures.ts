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

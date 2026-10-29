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

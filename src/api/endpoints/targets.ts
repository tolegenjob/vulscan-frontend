import { api } from '../client'
import type {
  AccessRule,
  AccessRuleInput,
  CreateEndpointInput,
  CreateIdentityInput,
  Endpoint,
  Identity,
  ImportResult,
  Page,
  Policy,
  Target,
} from '../types'

export const targetsApi = {
  list: (page = 0, size = 20) => api.get<Page<Target>>('/targets', { page, size }),
  get: (id: string) => api.get<Target>(`/targets/${id}`),
  create: (input: { name: string; baseUrl: string }) => api.post<Target>('/targets', input),
  verify: (id: string) => api.post<Target>(`/targets/${id}/verify`),
  approve: (id: string) => api.post<Target>(`/targets/${id}/approve`),
  remove: (id: string) => api.delete(`/targets/${id}`),
}

export const endpointsApi = {
  list: (targetId: string) => api.get<Endpoint[]>(`/targets/${targetId}/endpoints`),
  create: (targetId: string, input: CreateEndpointInput) => api.post<Endpoint>(`/targets/${targetId}/endpoints`, input),
  importOpenApi: (targetId: string, document: unknown, serverUrl: string) =>
    api.post<ImportResult>(`/targets/${targetId}/endpoints/import-openapi`, { document, serverUrl }),
  remove: (targetId: string, id: string) => api.delete(`/targets/${targetId}/endpoints/${id}`),
}

export const identitiesApi = {
  list: (targetId: string) => api.get<Identity[]>(`/targets/${targetId}/identities`),
  create: (targetId: string, input: CreateIdentityInput) => api.post<Identity>(`/targets/${targetId}/identities`, input),
  remove: (targetId: string, id: string) => api.delete(`/targets/${targetId}/identities/${id}`),
  testLogin: (targetId: string, id: string) =>
    api.post<{ ok: boolean; detail: string }>(`/targets/${targetId}/identities/${id}/test-login`),
}

export const accessRulesApi = {
  list: (targetId: string) => api.get<AccessRule[]>(`/targets/${targetId}/access-rules`),
  create: (targetId: string, input: AccessRuleInput) => api.post<AccessRule>(`/targets/${targetId}/access-rules`, input),
  remove: (targetId: string, id: string) => api.delete(`/targets/${targetId}/access-rules/${id}`),
}

export const policiesApi = {
  list: () => api.get<Policy[]>('/policies'),
}

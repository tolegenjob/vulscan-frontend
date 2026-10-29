import { api } from '../client'
import type { DashboardSummary, FindingDetail, FindingFilters, FindingListItem, Page, TriageStatus } from '../types'

export const findingsApi = {
  list: (filters: FindingFilters) =>
    api.get<Page<FindingListItem>>('/findings', { ...filters } as Record<string, string | number | undefined>),
  get: (id: string) => api.get<FindingDetail>(`/findings/${id}`),
  triage: (id: string, triageStatus: TriageStatus) => api.patch<FindingDetail>(`/findings/${id}`, { triageStatus }),
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/dashboard/summary'),
}

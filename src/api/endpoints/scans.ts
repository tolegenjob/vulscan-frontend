import { api } from '../client'
import type { CreateScanInput, Page, Scan, ScanListItem } from '../types'

export const scansApi = {
  list: (page = 0, size = 20) => api.get<Page<ScanListItem>>('/scans', { page, size }),
  get: (id: string) => api.get<Scan>(`/scans/${id}`),
  create: (input: CreateScanInput) => api.post<Scan>('/scans', input),
  cancel: (id: string) => api.post<Scan>(`/scans/${id}/cancel`),
  rerun: (id: string) => api.post<Scan>(`/scans/${id}/rerun`),
}

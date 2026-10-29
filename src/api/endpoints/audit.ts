import { api } from '../client'
import type { AuditEvent, Page } from '../types'

export const auditApi = {
  list: (page = 0, size = 50) => api.get<Page<AuditEvent>>('/audit-events', { page, size }),
}

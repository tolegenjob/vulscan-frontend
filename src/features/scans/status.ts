import type { JobStatus, ModuleType, ScanStatus } from '../../api/types'

export const ACTIVE_SCAN: ReadonlySet<ScanStatus> = new Set(['PENDING', 'RUNNING', 'CANCELLING'])
export const isActiveScan = (s: ScanStatus | undefined) => s !== undefined && ACTIVE_SCAN.has(s)

export const scanStatusLabel: Record<ScanStatus, string> = {
  PENDING: 'В очереди',
  RUNNING: 'Выполняется',
  COMPLETED: 'Завершено',
  PARTIALLY_COMPLETED: 'Завершено частично',
  FAILED: 'Ошибка',
  CANCELLING: 'Отменяется',
  CANCELLED: 'Отменено',
}

export const scanStatusColor: Record<ScanStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  PENDING: 'default',
  RUNNING: 'info',
  COMPLETED: 'success',
  PARTIALLY_COMPLETED: 'warning',
  FAILED: 'error',
  CANCELLING: 'warning',
  CANCELLED: 'default',
}

export const jobStatusLabel: Record<JobStatus, string> = {
  PENDING: 'Ожидает',
  QUEUED: 'В очереди',
  RUNNING: 'Выполняется',
  COMPLETED: 'Завершено',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменено',
}

export const moduleLabel: Record<ModuleType, string> = { XSS: 'XSS', SQLI: 'SQL-инъекции', IDOR: 'IDOR' }

const errorTexts: Record<string, string> = {
  QUEUE_TIMEOUT: 'модуль недоступен: задание не было взято в работу вовремя',
  HEARTBEAT_LOST: 'модуль перестал отвечать во время работы',
  DEADLINE_EXCEEDED: 'превышено максимальное время сканирования',
  TARGET_UNREACHABLE: 'цель недоступна',
  AUTH_FAILED: 'не удалось войти под выбранной учётной записью',
  SCOPE_VIOLATION: 'запрос выходит за разрешённую область',
  INVALID_JOB: 'модуль отклонил задание как некорректное',
  INTERNAL_ERROR: 'внутренняя ошибка модуля',
}

export function describeJobError(code: string | null): string {
  if (!code) return 'неизвестная ошибка'
  return errorTexts[code] ?? `ошибка ${code}`
}

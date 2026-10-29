export interface FieldError {
  field: string
  code: string
  message: string
}

/** Единый формат ошибки Core (раздел B.8.6) плюс клиентские коды NETWORK_ERROR и INVALID_RESPONSE. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors: FieldError[]
  readonly correlationId?: string
  readonly retryAfterSec?: number

  constructor(init: {
    status: number
    code: string
    message: string
    fieldErrors?: FieldError[]
    correlationId?: string
    retryAfterSec?: number
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.status = init.status
    this.code = init.code
    this.fieldErrors = init.fieldErrors ?? []
    this.correlationId = init.correlationId
    this.retryAfterSec = init.retryAfterSec
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError
}

/** Сообщение для пользователя; неизвестные коды не раскрывают технических деталей. */
export function describeError(e: unknown, overrides: Record<string, string> = {}): string {
  if (!isApiError(e)) return 'Произошла непредвиденная ошибка'
  if (overrides[e.code]) return overrides[e.code]
  switch (e.code) {
    case 'NETWORK_ERROR':
      return 'Нет связи с сервером'
    case 'RATE_LIMITED':
      return e.retryAfterSec ? `Слишком много запросов. Повторите через ${e.retryAfterSec} с` : 'Слишком много запросов'
    case 'FORBIDDEN':
      return 'Недостаточно прав'
    case 'NOT_FOUND':
      return 'Не найдено'
    case 'VALIDATION_FAILED':
      return e.fieldErrors.length ? e.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ') : e.message
    default:
      return e.message || 'Ошибка запроса'
  }
}

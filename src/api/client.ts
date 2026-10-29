import { config } from '../config'
import { ApiError, type FieldError } from './errors'

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
type QueryValue = string | number | boolean | null | undefined | readonly string[]

export interface RequestOptions {
  body?: unknown
  query?: Record<string, QueryValue>
  signal?: AbortSignal
}

const MUTATING: ReadonlySet<Method> = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

let unauthorizedHandler: (() => void) | null = null

/** Вызывается при 401 на любом запросе, кроме входа. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

export function readCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

function correlationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(config.apiBaseUrl + path, window.location.origin)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v))
      else url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: { code?: string; message?: string; fieldErrors?: FieldError[]; correlationId?: string } = {}
  try {
    body = await response.json()
  } catch {
    // тело не JSON: остаётся общий код ниже
  }
  const retryAfter = Number(response.headers.get('Retry-After'))
  return new ApiError({
    status: response.status,
    code: body.code ?? `HTTP_${response.status}`,
    message: body.message ?? response.statusText ?? 'Request failed',
    fieldErrors: body.fieldErrors,
    correlationId: body.correlationId ?? response.headers.get('X-Correlation-Id') ?? undefined,
    retryAfterSec: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  })
}

export async function request<T>(method: Method, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Correlation-Id': correlationId() }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (MUTATING.has(method)) {
    const token = readCsrfToken()
    if (token) headers['X-XSRF-TOKEN'] = token
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: 'include',
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Network error' })
  }

  if (!response.ok) {
    const error = await toApiError(response)
    if (response.status === 401 && path !== '/auth/login') unauthorizedHandler?.()
    throw error
  }
  if (response.status === 204) return undefined as T
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError({ status: response.status, code: 'INVALID_RESPONSE', message: 'Invalid server response' })
  }
}

export const api = {
  get: <T>(path: string, query?: Record<string, QueryValue>, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

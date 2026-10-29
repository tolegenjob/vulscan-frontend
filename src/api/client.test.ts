import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '../../tests/mocks/server'
import { api } from './client'
import { ApiError, isApiError } from './errors'

describe('api client', () => {
  it('sends the CSRF header only on mutating methods', async () => {
    document.cookie = 'XSRF-TOKEN=csrf-123; path=/'
    const seen: Record<string, string | null> = {}
    server.use(
      http.get(`${API}/ping`, ({ request }) => {
        seen.get = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ ok: true })
      }),
      http.post(`${API}/ping`, ({ request }) => {
        seen.post = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ ok: true })
      }),
      http.patch(`${API}/ping`, ({ request }) => {
        seen.patch = request.headers.get('X-XSRF-TOKEN')
        return HttpResponse.json({ ok: true })
      }),
      http.delete(`${API}/ping`, ({ request }) => {
        seen.delete = request.headers.get('X-XSRF-TOKEN')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await api.get('/ping')
    await api.post('/ping', {})
    await api.patch('/ping', {})
    await api.delete('/ping')
    expect(seen).toEqual({ get: null, post: 'csrf-123', patch: 'csrf-123', delete: 'csrf-123' })
  })

  it('adds a correlation id to every request', async () => {
    let id: string | null = null
    server.use(
      http.get(`${API}/ping`, ({ request }) => {
        id = request.headers.get('X-Correlation-Id')
        return HttpResponse.json({})
      }),
    )
    await api.get('/ping')
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('turns an error body into ApiError with code and field errors', async () => {
    server.use(
      http.post(`${API}/things`, () =>
        HttpResponse.json(
          {
            status: 400,
            code: 'VALIDATION_FAILED',
            message: 'Request validation failed',
            correlationId: 'c-1',
            fieldErrors: [{ field: 'name', code: 'NotBlank', message: 'must not be blank' }],
          },
          { status: 400 },
        ),
      ),
    )
    const error = await api.post('/things', {}).catch((e) => e)
    expect(isApiError(error)).toBe(true)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_FAILED')
    expect(error.fieldErrors[0]).toMatchObject({ field: 'name' })
    expect(error.correlationId).toBe('c-1')
  })

  it('reads Retry-After on 429', async () => {
    server.use(
      http.get(`${API}/busy`, () =>
        HttpResponse.json({ code: 'RATE_LIMITED', message: 'Too many requests' }, { status: 429, headers: { 'Retry-After': '30' } }),
      ),
    )
    const error = await api.get('/busy').catch((e) => e)
    expect(error.retryAfterSec).toBe(30)
  })

  it('maps an unreachable server to NETWORK_ERROR', async () => {
    server.use(http.get(`${API}/down`, () => HttpResponse.error()))
    const error = await api.get('/down').catch((e) => e)
    expect(error.code).toBe('NETWORK_ERROR')
  })

  it('handles non-JSON error bodies', async () => {
    server.use(http.get(`${API}/html`, () => new HttpResponse('<html>bad gateway</html>', { status: 502 })))
    const error = await api.get('/html').catch((e) => e)
    expect(error.status).toBe(502)
    expect(error.code).toBe('HTTP_502')
  })

  it('serializes query parameters and skips empty values', async () => {
    let url = ''
    server.use(
      http.get(`${API}/list`, ({ request }) => {
        url = request.url
        return HttpResponse.json({})
      }),
    )
    await api.get('/list', { page: 2, q: '', severity: undefined, tag: ['a', 'b'] })
    expect(url).toContain('page=2')
    expect(url).toContain('tag=a&tag=b')
    expect(url).not.toContain('q=')
    expect(url).not.toContain('severity')
  })
})

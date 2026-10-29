import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../tests/utils'
import type { Evidence } from '../api/types'
import { COLLAPSE_AT, EvidenceViewer } from './EvidenceViewer'

const render = (evidence: Evidence) => renderWithProviders(<EvidenceViewer evidence={evidence} />, { withAuth: false })

const PAYLOADS = [
  '<img src=x onerror=window.__pwned=1>',
  '<script>window.__pwned=1</script>',
  '"><svg onload=window.__pwned=1>',
  'javascript:alert(1)',
]

describe('EvidenceViewer (security)', () => {
  it('shows hostile evidence as text and never creates elements or runs code', async () => {
    delete (window as unknown as { __pwned?: number }).__pwned
    render({
      request: {
        method: 'GET',
        url: `https://t.example/?q=${PAYLOADS[3]}`,
        headers: { 'X-Test': PAYLOADS[0] },
        bodyExcerpt: PAYLOADS[1],
      },
      response: { status: 200, headers: { Location: PAYLOADS[3] }, bodyExcerpt: PAYLOADS.join('\n'), highlights: [{ start: 0, end: 10 }] },
      observations: [{ key: PAYLOADS[2], value: PAYLOADS[0] }],
    })
    const viewer = screen.getByTestId('evidence-viewer')
    await new Promise((r) => setTimeout(r, 50))

    expect(viewer.querySelector('img, script, svg, iframe, object, embed, link, style')).toBeNull()
    expect(viewer.querySelector('a')).toBeNull()
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
    const text = viewer.textContent ?? ''
    for (const p of PAYLOADS) expect(text).toContain(p)
    // ни у одного элемента нет обработчиков-атрибутов
    for (const el of Array.from(viewer.querySelectorAll('*'))) {
      expect(el.getAttributeNames().filter((n) => n.startsWith('on'))).toEqual([])
    }
  })

  it('shows the URL as text, not as a link', () => {
    render({ request: { method: 'GET', url: 'https://t.example/path' } })
    expect(screen.getByText('GET https://t.example/path')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('copies the URL on request', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render({ request: { method: 'GET', url: 'https://t.example/path' } })
    await userEvent.click(screen.getByRole('button', { name: 'Копировать URL' }))
    expect(writeText).toHaveBeenCalledWith('https://t.example/path')
    expect(await screen.findByText('URL скопирован')).toBeInTheDocument()
  })

  it('collapses long bodies and expands them on demand', async () => {
    const body = 'a'.repeat(COLLAPSE_AT) + 'TAIL'
    render({ response: { status: 200, bodyExcerpt: body } })
    const block = screen.getByLabelText('Тело ответа')
    expect(block.textContent).not.toContain('TAIL')
    await userEvent.click(screen.getByRole('button', { name: /Показать всё/ }))
    expect(screen.getByLabelText('Тело ответа').textContent).toContain('TAIL')
    await userEvent.click(screen.getByRole('button', { name: 'Свернуть' }))
    expect(screen.getByLabelText('Тело ответа').textContent).not.toContain('TAIL')
  })

  it('highlights the matched range inside the response body', () => {
    render({ response: { status: 200, bodyExcerpt: 'abc MARK def', highlights: [{ start: 4, end: 8 }] } })
    const body = screen.getByLabelText('Тело ответа')
    expect(within(body).getByText('MARK').tagName).toBe('MARK')
  })

  it('says so when there is no evidence', () => {
    render({})
    expect(screen.getByText('Evidence отсутствует')).toBeInTheDocument()
  })
})

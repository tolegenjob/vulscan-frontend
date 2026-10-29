import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HighlightedText, normalizeHighlights } from './HighlightedText'

const marks = (text: string, hl: { start: number; end: number }[]) => {
  const { container } = render(<HighlightedText text={text} highlights={hl} />)
  return Array.from(container.querySelectorAll('mark')).map((m) => m.textContent)
}

describe('HighlightedText', () => {
  it('wraps the given range in <mark>', () => {
    const { container } = render(<HighlightedText text="hello world" highlights={[{ start: 6, end: 11 }]} />)
    expect(container.textContent).toBe('hello world')
    expect(container.querySelector('mark')?.textContent).toBe('world')
  })

  it('supports several ranges', () => {
    expect(marks('abcdefgh', [{ start: 0, end: 2 }, { start: 4, end: 6 }])).toEqual(['ab', 'ef'])
  })

  it('ignores invalid ranges without throwing', () => {
    const text = 'abcdef'
    expect(marks(text, [{ start: -1, end: 2 }])).toEqual([])
    expect(marks(text, [{ start: 2, end: 99 }])).toEqual([])
    expect(marks(text, [{ start: 3, end: 3 }])).toEqual([])
    expect(marks(text, [{ start: 4, end: 2 }])).toEqual([])
    expect(marks(text, [{ start: 1.5, end: 3 }])).toEqual([])
    expect(marks(text, [{ start: NaN, end: 3 }])).toEqual([])
  })

  it('keeps the first of overlapping ranges', () => {
    expect(normalizeHighlights('abcdefgh', [{ start: 2, end: 6 }, { start: 0, end: 3 }, { start: 4, end: 7 }])).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ])
  })

  it('handles Cyrillic text', () => {
    expect(marks('Привет, мир', [{ start: 8, end: 11 }])).toEqual(['мир'])
  })

  it('counts offsets in UTF-16 code units (an emoji is two units)', () => {
    const text = 'a😀b MARK'
    expect(text.length).toBe(9)
    expect(marks(text, [{ start: 5, end: 9 }])).toEqual(['MARK'])
  })

  it('ignores ranges that cut a surrogate pair in half', () => {
    expect(marks('a😀b', [{ start: 2, end: 3 }])).toEqual([])
    expect(marks('a😀b', [{ start: 1, end: 2 }])).toEqual([])
  })

  it('never interprets markup', () => {
    const { container } = render(<HighlightedText text="<b>bold</b>" highlights={[{ start: 3, end: 7 }]} />)
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toBe('<b>bold</b>')
  })

  it('renders plain text without highlights', () => {
    const { container } = render(<HighlightedText text="plain" />)
    expect(container.textContent).toBe('plain')
    expect(container.querySelector('mark')).toBeNull()
  })
})

import type { ReactNode } from 'react'
import type { Highlight } from '../api/types'

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff

/**
 * Оставляет только корректные диапазоны (0 <= start < end <= length, целые, не пересекающиеся, не режущие суррогатную пару).
 * Смещения считаются в UTF-16 code units — так же, как String.length в JavaScript и в модулях (контракт B.8.3).
 */
export function normalizeHighlights(text: string, highlights: readonly Highlight[] | undefined): Highlight[] {
  if (!highlights?.length) return []
  const splitsPair = (i: number) => i > 0 && i < text.length && isHigh(text.charCodeAt(i - 1)) && isLow(text.charCodeAt(i))
  const valid = highlights
    .filter(
      (h) =>
        h !== null &&
        typeof h === 'object' &&
        Number.isInteger(h.start) &&
        Number.isInteger(h.end) &&
        h.start >= 0 &&
        h.start < h.end &&
        h.end <= text.length &&
        !splitsPair(h.start) &&
        !splitsPair(h.end),
    )
    .sort((a, b) => a.start - b.start || a.end - b.end)
  const result: Highlight[] = []
  let lastEnd = 0
  for (const h of valid) {
    if (h.start < lastEnd) continue // пересечение: оставляем первый диапазон
    result.push({ start: h.start, end: h.end })
    lastEnd = h.end
  }
  return result
}

/** Текст с подсветкой через React-узлы: HTML не интерпретируется ни при каких входных данных. */
export function HighlightedText({ text, highlights }: { text: string; highlights?: readonly Highlight[] }) {
  const ranges = normalizeHighlights(text, highlights)
  if (ranges.length === 0) return <>{text}</>
  const parts: ReactNode[] = []
  let cursor = 0
  ranges.forEach((r, i) => {
    if (r.start > cursor) parts.push(text.slice(cursor, r.start))
    parts.push(<mark key={i}>{text.slice(r.start, r.end)}</mark>)
    cursor = r.end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

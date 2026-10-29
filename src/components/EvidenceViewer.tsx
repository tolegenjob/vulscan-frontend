import { Box, Button, Stack, Typography } from '@mui/material'
import { useState } from 'react'
import type { Evidence, Highlight } from '../api/types'
import { useNotify } from './Notifier'
import { HighlightedText } from './HighlightedText'

export const COLLAPSE_AT = 2048

const preSx = {
  m: 0,
  p: 1,
  bgcolor: 'action.hover',
  borderRadius: 1,
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  fontFamily: 'monospace',
  fontSize: 13,
} as const

function headerLines(headers: Record<string, string> | undefined): string {
  return Object.entries(headers ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
}

function TextBlock({ label, text, highlights }: { label: string; text: string; highlights?: Highlight[] }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > COLLAPSE_AT
  const shown = long && !expanded ? text.slice(0, COLLAPSE_AT) : text
  // подсветки за пределами показанной части отбрасываются, чтобы не резать диапазон
  const visible = long && !expanded ? highlights?.filter((h) => h.end <= COLLAPSE_AT) : highlights
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Box component="pre" sx={preSx} aria-label={label}>
        <HighlightedText text={shown} highlights={visible} />
        {long && !expanded && '…'}
      </Box>
      {long && (
        <Button size="small" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Свернуть' : `Показать всё (${text.length} символов)`}
        </Button>
      )}
    </Box>
  )
}

/** Показывает перехваченный запрос/ответ только как текст. URL — не ссылка, чтобы клик не открывал проверяемую цель. */
export function EvidenceViewer({ evidence }: { evidence: Evidence }) {
  const notify = useNotify()
  const { request, response, observations } = evidence

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(request?.url ?? '')
      notify('URL скопирован', 'success')
    } catch {
      notify('Не удалось скопировать URL', 'warning')
    }
  }

  return (
    <Stack spacing={2} data-testid="evidence-viewer">
      {request && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Запрос</Typography>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Box component="code" sx={{ wordBreak: 'break-all' }}>{request.method} {request.url}</Box>
            <Button size="small" onClick={() => void copyUrl()}>Копировать URL</Button>
          </Stack>
          {headerLines(request.headers) && <TextBlock label="Заголовки запроса" text={headerLines(request.headers)} />}
          {request.bodyExcerpt && <TextBlock label="Тело запроса" text={request.bodyExcerpt} />}
        </Stack>
      )}
      {response && (
        <Stack spacing={1}>
          <Typography variant="subtitle2">Ответ: HTTP {response.status}</Typography>
          {headerLines(response.headers) && <TextBlock label="Заголовки ответа" text={headerLines(response.headers)} />}
          {response.bodyExcerpt && <TextBlock label="Тело ответа" text={response.bodyExcerpt} highlights={response.highlights} />}
        </Stack>
      )}
      {observations && observations.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">Наблюдения</Typography>
          {observations.map((o, i) => (
            <Typography key={i} variant="body2">
              <strong>{o.key}:</strong> {o.value}
            </Typography>
          ))}
        </Stack>
      )}
      {!request && !response && !observations?.length && <Typography color="text.secondary">Evidence отсутствует</Typography>}
    </Stack>
  )
}

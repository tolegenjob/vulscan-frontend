import { Chip } from '@mui/material'
import type { Severity, TriageStatus, Verdict } from '../api/types'

const severityProps: Record<Severity, { label: string; color: 'error' | 'warning' | 'info' | 'default'; variant: 'filled' | 'outlined' }> = {
  CRITICAL: { label: 'Критический', color: 'error', variant: 'filled' },
  HIGH: { label: 'Высокий', color: 'error', variant: 'outlined' },
  MEDIUM: { label: 'Средний', color: 'warning', variant: 'filled' },
  LOW: { label: 'Низкий', color: 'info', variant: 'outlined' },
  INFO: { label: 'Информация', color: 'default', variant: 'outlined' },
}
export const severityLabel = (s: Severity) => severityProps[s].label
export const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

export function SeverityChip({ severity }: { severity: Severity }) {
  const p = severityProps[severity]
  return <Chip size="small" label={p.label} color={p.color} variant={p.variant} />
}

export const verdictLabel: Record<Verdict, string> = {
  CONFIRMED: 'Подтверждено',
  LIKELY: 'Вероятно',
  SUSPECTED: 'Предположение',
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Chip size="small" variant="outlined" label={verdictLabel[verdict]} color={verdict === 'CONFIRMED' ? 'success' : 'default'} />
}

export const triageLabel: Record<TriageStatus, string> = {
  OPEN: 'Открыто',
  FALSE_POSITIVE: 'Ложное срабатывание',
  FIXED: 'Исправлено',
}

export function TriageChip({ status }: { status: TriageStatus }) {
  return <Chip size="small" label={triageLabel[status]} color={status === 'OPEN' ? 'default' : 'success'} variant={status === 'OPEN' ? 'outlined' : 'filled'} />
}

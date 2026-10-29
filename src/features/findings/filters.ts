import type { FindingFilters, ModuleType, Severity, TriageStatus, Verdict, VulnType } from '../../api/types'

export const PAGE_SIZES = [25, 50, 100] as const
export const SORT_FIELDS = ['createdAt', 'severity', 'confidence', 'url'] as const

export const MODULES: ModuleType[] = ['XSS', 'SQLI', 'IDOR']
export const VULN_TYPES: VulnType[] = [
  'XSS_REFLECTED', 'XSS_STORED', 'SQLI_ERROR_BASED', 'SQLI_BOOLEAN_BASED', 'SQLI_TIME_BASED', 'IDOR_HORIZONTAL', 'IDOR_VERTICAL',
]
export const VERDICTS: Verdict[] = ['CONFIRMED', 'LIKELY', 'SUSPECTED']
export const TRIAGE: TriageStatus[] = ['OPEN', 'FALSE_POSITIVE', 'FIXED']

const oneOf = <T extends string>(value: string | null, allowed: readonly T[]): T | undefined =>
  value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : undefined

export function parseFilters(params: URLSearchParams): FindingFilters {
  const minConfidence = Number(params.get('minConfidence'))
  const size = Number(params.get('size'))
  return {
    scanId: params.get('scanId') || undefined,
    targetId: params.get('targetId') || undefined,
    endpoint: params.get('endpoint') || undefined,
    moduleType: oneOf(params.get('moduleType'), MODULES),
    vulnType: oneOf(params.get('vulnType'), VULN_TYPES),
    severity: oneOf<Severity>(params.get('severity'), ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']),
    verdict: oneOf(params.get('verdict'), VERDICTS),
    triageStatus: oneOf(params.get('triageStatus'), TRIAGE),
    minConfidence: minConfidence > 0 && minConfidence <= 100 ? Math.round(minConfidence) : undefined,
    q: params.get('q') || undefined,
    sort: params.get('sort') || undefined,
    page: Math.max(0, Number(params.get('page')) || 0),
    size: (PAGE_SIZES as readonly number[]).includes(size) ? size : PAGE_SIZES[0],
  }
}

/** Применяет изменения к параметрам URL; пустые значения удаляются, при смене фильтра страница сбрасывается. */
export function applyPatch(params: URLSearchParams, patch: Record<string, string | number | undefined>): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value === '' || value === 0 && key !== 'page') next.delete(key)
    else next.set(key, String(value))
  }
  if (!('page' in patch)) next.delete('page')
  if (next.get('page') === '0') next.delete('page')
  return next
}

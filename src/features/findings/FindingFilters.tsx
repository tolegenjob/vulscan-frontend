import { Button, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import type { FindingFilters as Filters } from '../../api/types'
import { useDebounce } from '../../hooks/useDebounce'
import { SEVERITIES, severityLabel, triageLabel, verdictLabel } from '../../components/badges'
import { MODULES, SORT_FIELDS, TRIAGE, VERDICTS, VULN_TYPES } from './filters'

const sortLabel: Record<string, string> = { createdAt: 'Дата', severity: 'Серьёзность', confidence: 'Уверенность', url: 'URL' }

interface Props {
  filters: Filters
  onChange: (patch: Record<string, string | number | undefined>) => void
  onReset: () => void
}

function Select({ label, value, options, onChange }: {
  label: string
  value: string | undefined
  options: { value: string; label: string }[]
  onChange: (v: string | undefined) => void
}) {
  return (
    <TextField select size="small" label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} sx={{ minWidth: 160 }}>
      <MenuItem value="">Все</MenuItem>
      {options.map((o) => (
        <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
      ))}
    </TextField>
  )
}

export function FindingFilters({ filters, onChange, onReset }: Props) {
  const [text, setText] = useState(filters.q ?? '')
  const debounced = useDebounce(text, 400)
  const [sortField, direction] = (filters.sort ?? 'createdAt,desc').split(',')

  useEffect(() => {
    if ((filters.q ?? '') !== debounced) onChange({ q: debounced.trim() || undefined })
  }, [debounced]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setText(filters.q ?? ''), [filters.q])

  return (
    <Stack spacing={2} role="search" aria-label="Фильтры находок">
      <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
        <TextField size="small" label="Поиск" value={text} onChange={(e) => setText(e.target.value)} sx={{ minWidth: 220 }} />
        <Select label="Модуль" value={filters.moduleType} options={MODULES.map((m) => ({ value: m, label: m }))} onChange={(v) => onChange({ moduleType: v })} />
        <Select label="Тип уязвимости" value={filters.vulnType} options={VULN_TYPES.map((v) => ({ value: v, label: v }))} onChange={(v) => onChange({ vulnType: v })} />
        <Select label="Серьёзность" value={filters.severity} options={SEVERITIES.map((s) => ({ value: s, label: severityLabel(s) }))} onChange={(v) => onChange({ severity: v })} />
        <Select label="Вердикт" value={filters.verdict} options={VERDICTS.map((v) => ({ value: v, label: verdictLabel[v] }))} onChange={(v) => onChange({ verdict: v })} />
        <Select label="Статус" value={filters.triageStatus} options={TRIAGE.map((t) => ({ value: t, label: triageLabel[t] }))} onChange={(v) => onChange({ triageStatus: v })} />
      </Stack>
      <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
        <Stack sx={{ width: 240 }}>
          <Typography variant="caption" id="min-confidence-label">Мин. уверенность: {filters.minConfidence ?? 0}%</Typography>
          <Slider
            aria-labelledby="min-confidence-label"
            size="small"
            min={0}
            max={100}
            step={5}
            defaultValue={filters.minConfidence ?? 0}
            key={filters.minConfidence ?? 0}
            onChangeCommitted={(_, v) => onChange({ minConfidence: v as number })}
          />
        </Stack>
        <Select label="Сортировка" value={sortField} options={SORT_FIELDS.map((f) => ({ value: f, label: sortLabel[f] }))} onChange={(v) => onChange({ sort: v ? `${v},${direction}` : undefined })} />
        <Button size="small" onClick={() => onChange({ sort: `${sortField},${direction === 'asc' ? 'desc' : 'asc'}` })}>
          {direction === 'asc' ? 'По возрастанию' : 'По убыванию'}
        </Button>
        {filters.endpoint && <Button size="small" onClick={() => onChange({ endpoint: undefined })}>Снять фильтр по endpoint</Button>}
        <Button size="small" onClick={onReset}>Сбросить фильтры</Button>
      </Stack>
    </Stack>
  )
}

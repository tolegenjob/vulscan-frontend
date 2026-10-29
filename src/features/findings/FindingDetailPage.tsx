import { Box, Button, CircularProgress, Link, Paper, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { findingsApi } from '../../api/endpoints/findings'
import { describeError, isApiError } from '../../api/errors'
import type { TriageStatus } from '../../api/types'
import { EvidenceViewer } from '../../components/EvidenceViewer'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { SeverityChip, TriageChip, VerdictBadge } from '../../components/badges'

const preSx = { m: 0, p: 1, bgcolor: 'action.hover', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13 } as const

export function FindingDetailPage() {
  const { id = '' } = useParams()
  const [tab, setTab] = useState(0)
  const queryClient = useQueryClient()
  const notify = useNotify()
  const query = useQuery({ queryKey: ['finding', id], queryFn: () => findingsApi.get(id) })

  const triage = useMutation({
    mutationFn: (status: TriageStatus) => findingsApi.triage(id, status),
    onSuccess: (f) => {
      queryClient.setQueryData(['finding', id], f)
      void queryClient.invalidateQueries({ queryKey: ['findings'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      notify('Статус обновлён', 'success')
    },
    onError: (e) => notify(describeError(e), 'error'),
  })

  if (query.isPending) return <CircularProgress aria-label="Загрузка" />
  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <ErrorState error={query.error} title="Finding не найден" />
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  const f = query.data

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
          <SeverityChip severity={f.severity} />
          <VerdictBadge verdict={f.verdict} />
          <TriageChip status={f.triageStatus} />
          <Typography variant="body2" color="text.secondary">Уверенность {f.confidence}% · {f.cwe}</Typography>
        </Stack>
        <Typography variant="h5" component="h1">{f.title}</Typography>
        <Typography sx={{ wordBreak: 'break-all' }} color="text.secondary">
          {f.method} {f.url}
          {f.parameterName && ` · параметр ${f.parameterName}${f.parameterLocation ? ` (${f.parameterLocation})` : ''}`}
        </Typography>
      </Box>

      <Typography>{f.summary}</Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
        {f.triageStatus === 'OPEN' ? (
          <>
            <Button variant="outlined" disabled={triage.isPending} onClick={() => triage.mutate('FALSE_POSITIVE')}>False positive</Button>
            <Button variant="outlined" disabled={triage.isPending} onClick={() => triage.mutate('FIXED')}>Fixed</Button>
          </>
        ) : (
          <Button variant="outlined" disabled={triage.isPending} onClick={() => triage.mutate('OPEN')}>Reopen</Button>
        )}
        <Link component={RouterLink} to={`/scans/${f.scanId}`}>Сканирование</Link>
        <Link component={RouterLink} to={`/targets/${f.targetId}`}>Цель</Link>
        {f.endpointId && <Link component={RouterLink} to={`/targets/${f.targetId}?endpoint=${f.endpointId}`}>Endpoint</Link>}
        <Link component={RouterLink} to={`/findings?vulnType=${f.vulnType}&targetId=${f.targetId}`}>Похожие находки</Link>
      </Stack>

      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} aria-label="Разделы находки">
          <Tab label="Evidence" />
          <Tab label="Details" />
          <Tab label="Recommendation" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <EvidenceViewer evidence={f.evidence} />}
          {tab === 1 && <Box component="pre" sx={preSx}>{JSON.stringify(f.details, null, 2)}</Box>}
          {tab === 2 && <Typography>{f.recommendation}</Typography>}
        </Box>
      </Paper>
    </Stack>
  )
}

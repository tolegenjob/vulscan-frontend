import { Alert, Box, Button, Chip, CircularProgress, Link, Stack, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom'
import { scansApi } from '../../api/endpoints/scans'
import { targetsApi } from '../../api/endpoints/targets'
import { describeError, isApiError } from '../../api/errors'
import type { Scan, Severity } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { JobCard } from './JobCard'
import { describeJobError, isActiveScan, moduleLabel, scanStatusColor, scanStatusLabel } from './status'
import { useScan } from './useScan'

const SEVERITIES: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']

function PartialBanner({ scan }: { scan: Scan }) {
  const ok = scan.jobs.filter((j) => j.status === 'COMPLETED')
  const bad = scan.jobs.filter((j) => j.status === 'FAILED')
  return (
    <Alert severity="warning">
      {ok.map((j) => `${moduleLabel[j.moduleType]} завершён`).join(', ')}
      {ok.length > 0 && bad.length > 0 && ', '}
      {bad.map((j) => `${moduleLabel[j.moduleType]} — ${describeJobError(j.errorCode)}`).join(', ')}.
      {ok.length > 0 && ' Результаты завершённых модулей доступны ниже.'}
    </Alert>
  )
}

export function ScanDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const query = useScan(id)
  const scan = query.data
  const target = useQuery({
    queryKey: ['target', scan?.targetId],
    queryFn: () => targetsApi.get(scan!.targetId),
    enabled: !!scan,
  })

  const cancel = useMutation({
    mutationFn: () => scansApi.cancel(id),
    onSuccess: (s) => {
      queryClient.setQueryData(['scan', id], s)
      setConfirmCancel(false)
      notify('Отмена запрошена', 'info')
    },
    onError: (e) => {
      setConfirmCancel(false)
      notify(describeError(e, { SCAN_ALREADY_FINISHED: 'Сканирование уже завершено' }), 'error')
      void queryClient.invalidateQueries({ queryKey: ['scan', id] })
    },
  })
  const rerun = useMutation({
    mutationFn: () => scansApi.rerun(id),
    onSuccess: (s) => {
      notify('Повторное сканирование запущено', 'success')
      void navigate(`/scans/${s.id}`)
    },
    onError: (e) =>
      notify(
        describeError(e, {
          TOO_MANY_ACTIVE_SCANS: 'Дождитесь завершения активных сканирований',
          TARGET_NOT_VERIFIED: 'Цель больше не подтверждена',
        }),
        'error',
      ),
  })

  if (query.isPending) return <CircularProgress aria-label="Загрузка" />
  if (!scan) {
    if (isApiError(query.error) && query.error.status === 404) return <ErrorState error={query.error} title="Сканирование не найдено" />
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }

  const active = isActiveScan(scan.status)
  const totalFindings = SEVERITIES.reduce((n, s) => n + (scan.findingCounts[s] ?? 0), 0)

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" component="h1">Сканирование</Typography>
          <Typography color="text.secondary">
            Цель:{' '}
            {target.data ? <Link component={RouterLink} to={`/targets/${scan.targetId}`}>{target.data.name}</Link> : '…'} ·{' '}
            {new Date(scan.createdAt).toLocaleString('ru-RU')}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={scanStatusLabel[scan.status]} color={scanStatusColor[scan.status]} />
          {active && scan.status !== 'CANCELLING' && (
            <Button color="warning" onClick={() => setConfirmCancel(true)}>Отменить</Button>
          )}
          {!active && (
            <Button variant="outlined" onClick={() => rerun.mutate()} disabled={rerun.isPending}>Повторить</Button>
          )}
        </Stack>
      </Stack>

      {query.isError && (
        <Alert severity="warning">Не удаётся обновить статус. Повторная попытка выполняется автоматически.</Alert>
      )}
      {scan.status === 'CANCELLING' && <Alert severity="info">Сканирование отменяется, это может занять до 15 секунд.</Alert>}
      {scan.status === 'PARTIALLY_COMPLETED' && <PartialBanner scan={scan} />}

      <Stack spacing={1}>
        {scan.jobs.map((j) => (
          <JobCard key={j.id} job={j} />
        ))}
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography variant="subtitle2">Находки:</Typography>
        {SEVERITIES.map((s) => (
          <Chip key={s} size="small" variant="outlined" label={`${s}: ${scan.findingCounts[s] ?? 0}`} />
        ))}
        <Link component={RouterLink} to={`/findings?scanId=${scan.id}`}>
          Все находки этого сканирования ({totalFindings})
        </Link>
      </Stack>

      <ConfirmDialog
        open={confirmCancel}
        title="Отменить сканирование?"
        message="Уже найденные уязвимости сохранятся. Задания будут остановлены."
        confirmLabel="Отменить сканирование"
        busy={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onCancel={() => setConfirmCancel(false)}
      />
    </Stack>
  )
}

import { Alert, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material'
import type { ScanJob } from '../../api/types'
import { describeJobError, jobStatusLabel, moduleLabel } from './status'

const color = (s: ScanJob['status']) =>
  s === 'COMPLETED' ? 'success' : s === 'FAILED' ? 'error' : s === 'RUNNING' ? 'info' : 'default'

export function JobCard({ job, totalEndpoints }: { job: ScanJob; totalEndpoints?: number }) {
  const running = job.status === 'RUNNING'
  return (
    <Paper variant="outlined" sx={{ p: 2 }} aria-label={`Задание ${moduleLabel[job.moduleType]}`}>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">{moduleLabel[job.moduleType]}</Typography>
          <Chip size="small" label={jobStatusLabel[job.status]} color={color(job.status)} />
        </Stack>
        {running && <LinearProgress {...(totalEndpoints ? { variant: 'determinate', value: Math.min(100, (job.endpointsDone / totalEndpoints) * 100) } : {})} />}
        <Typography variant="body2" color="text.secondary">
          Endpoints обработано: {job.endpointsDone} · Запросов отправлено: {job.requestsSent} · Попытка: {job.attempt}
        </Typography>
        {job.status === 'FAILED' && (
          <Alert severity="error">Ошибка: {describeJobError(job.errorCode)}</Alert>
        )}
        {job.resultIntegrity === 'INCOMPLETE' && (
          <Alert severity="warning">Результаты этого модуля могут быть неполными: часть находок не дошла до системы.</Alert>
        )}
      </Stack>
    </Paper>
  )
}

import { Button, Card, CardContent, CircularProgress, Grid, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { dashboardApi } from '../../api/endpoints/findings'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { SEVERITIES, severityLabel } from '../../components/badges'
import { scanStatusLabel } from '../scans/status'
import { SeverityChart } from './SeverityChart'

function Tile({ title, value, testId }: { title: string; value: string | number; testId: string }) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="body2" color="text.secondary">{title}</Typography>
        <Typography variant="h4" data-testid={testId}>{value}</Typography>
      </CardContent>
    </Card>
  )
}

function formatDuration(sec: number | null): string {
  if (sec === null) return '—'
  return sec >= 60 ? `${Math.floor(sec / 60)} мин ${Math.round(sec % 60)} с` : `${Math.round(sec)} с`
}

export function DashboardPage() {
  const query = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.summary, refetchInterval: 15_000 })

  if (query.isPending) return <CircularProgress aria-label="Загрузка" />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const d = query.data
  const totalOpen = SEVERITIES.reduce((n, s) => n + (d.openFindingsBySeverity[s] ?? 0), 0)

  return (
    <Stack spacing={3}>
      <Typography variant="h5" component="h1">Обзор</Typography>
      {totalOpen === 0 && d.recentScans.length === 0 ? (
        <EmptyState
          message="Данных пока нет. Добавьте цель и запустите первое сканирование."
          action={<Button variant="contained" component={RouterLink} to="/targets">К целям</Button>}
        />
      ) : (
        <>
          <Grid container spacing={2}>
            {SEVERITIES.map((s) => (
              <Grid key={s} size={{ xs: 6, sm: 4, md: 2.4 }}>
                <Tile title={`Открыто: ${severityLabel(s)}`} value={d.openFindingsBySeverity[s] ?? 0} testId={`tile-${s}`} />
              </Grid>
            ))}
            <Grid size={{ xs: 6, sm: 6 }}>
              <Tile title="Активные сканирования" value={d.activeScans} testId="tile-active" />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
              <Tile title="Среднее время сканирования" value={formatDuration(d.avgScanDurationSec)} testId="tile-avg" />
            </Grid>
          </Grid>

          <SeverityChart counts={d.openFindingsBySeverity} />

          <Stack spacing={1}>
            <Typography variant="h6" component="h2">Последние сканирования</Typography>
            {d.recentScans.length === 0 ? (
              <EmptyState message="Сканирований пока нет" />
            ) : (
              <Table size="small" aria-label="Последние сканирования">
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {d.recentScans.slice(0, 5).map((s) => (
                    <TableRow key={s.id}>
                      <TableCell><Link component={RouterLink} to={`/scans/${s.id}`}>{new Date(s.createdAt).toLocaleString('ru-RU')}</Link></TableCell>
                      <TableCell>{scanStatusLabel[s.status]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>
        </>
      )}
    </Stack>
  )
}

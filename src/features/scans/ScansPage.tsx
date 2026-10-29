import {
  Button,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { scansApi } from '../../api/endpoints/scans'
import { targetsApi } from '../../api/endpoints/targets'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { isActiveScan, scanStatusColor, scanStatusLabel } from './status'

function duration(start: string, end: string | null): string {
  if (!end) return '—'
  const sec = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 1000))
  return sec >= 60 ? `${Math.floor(sec / 60)} мин ${sec % 60} с` : `${sec} с`
}

export function ScansPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(0, Number(params.get('page')) || 0)
  const size = [10, 20, 50].includes(Number(params.get('size'))) ? Number(params.get('size')) : 20

  const query = useQuery({
    queryKey: ['scans', page, size],
    queryFn: () => scansApi.list(page, size),
    refetchInterval: (q) => (q.state.data?.items.some((s) => isActiveScan(s.status)) ? 5000 : false),
  })
  const targets = useQuery({ queryKey: ['targets', 0, 100], queryFn: () => targetsApi.list(0, 100) })
  const names = new Map((targets.data?.items ?? []).map((t) => [t.id, t.name]))

  function setPaging(nextPage: number, nextSize = size) {
    const next = new URLSearchParams(params)
    next.set('page', String(nextPage))
    next.set('size', String(nextSize))
    setParams(next)
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" component="h1">Сканирования</Typography>
        <Button variant="contained" component={RouterLink} to="/scans/new">Новое сканирование</Button>
      </Stack>
      {query.isPending && <CircularProgress aria-label="Загрузка" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.items.length === 0 && <EmptyState message="Сканирований пока нет" />}
      {query.data && query.data.items.length > 0 && (
        <>
          <Table size="small" aria-label="Список сканирований">
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Цель</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Длительность</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.items.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/scans/${s.id}`}>{new Date(s.createdAt).toLocaleString('ru-RU')}</Link>
                  </TableCell>
                  <TableCell>{names.get(s.targetId) ?? '—'}</TableCell>
                  <TableCell><Chip size="small" label={scanStatusLabel[s.status]} color={scanStatusColor[s.status]} /></TableCell>
                  <TableCell>{duration(s.createdAt, s.finishedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={query.data.total}
            page={page}
            rowsPerPage={size}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(_, p) => setPaging(p)}
            onRowsPerPageChange={(e) => setPaging(0, Number(e.target.value))}
            labelRowsPerPage="На странице"
          />
        </>
      )}
    </Stack>
  )
}

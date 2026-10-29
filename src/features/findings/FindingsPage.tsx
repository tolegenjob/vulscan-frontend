import {
  Alert,
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
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import { findingsApi } from '../../api/endpoints/findings'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { SeverityChip, TriageChip, VerdictBadge } from '../../components/badges'
import { FindingFilters } from './FindingFilters'
import { PAGE_SIZES, applyPatch, parseFilters } from './filters'

const MAX_USEFUL_TOTAL = 10_000

export function FindingsPage() {
  const [params, setParams] = useSearchParams()
  const filters = parseFilters(params)
  const query = useQuery({
    queryKey: ['findings', filters],
    queryFn: () => findingsApi.list(filters),
    placeholderData: keepPreviousData,
  })

  const change = (patch: Record<string, string | number | undefined>) => setParams(applyPatch(params, patch))

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">Находки</Typography>
      {filters.scanId && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`Сканирование: ${filters.scanId.slice(0, 8)}…`} onDelete={() => change({ scanId: undefined })} />
          <Link component={RouterLink} to={`/scans/${filters.scanId}`}>К сканированию</Link>
        </Stack>
      )}
      <FindingFilters filters={filters} onChange={change} onReset={() => setParams(new URLSearchParams())} />

      {query.isPending && <CircularProgress aria-label="Загрузка" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.total > MAX_USEFUL_TOTAL && <Alert severity="info">Найдено более 10 000 записей. Уточните фильтры.</Alert>}
      {query.data && query.data.items.length === 0 && <EmptyState message="Ничего не найдено, измените фильтры" />}
      {query.data && query.data.items.length > 0 && (
        <>
          <Table size="small" aria-label="Список находок">
            <TableHead>
              <TableRow>
                <TableCell>Серьёзность</TableCell>
                <TableCell>Вердикт</TableCell>
                <TableCell>Находка</TableCell>
                <TableCell>Параметр</TableCell>
                <TableCell align="right">Уверенность</TableCell>
                <TableCell>Статус</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.items.map((f) => (
                <TableRow key={f.id} hover>
                  <TableCell><SeverityChip severity={f.severity} /></TableCell>
                  <TableCell><VerdictBadge verdict={f.verdict} /></TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Link component={RouterLink} to={`/findings/${f.id}`}>{f.title}</Link>
                    <Typography variant="caption" display="block" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                      {f.method} {f.url}
                    </Typography>
                    <Link component={RouterLink} to={`/scans/${f.scanId}`} variant="caption">сканирование</Link>
                  </TableCell>
                  <TableCell>{f.parameterName ?? '—'}</TableCell>
                  <TableCell align="right">{f.confidence}%</TableCell>
                  <TableCell><TriageChip status={f.triageStatus} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={query.data.total}
            page={filters.page ?? 0}
            rowsPerPage={filters.size ?? PAGE_SIZES[0]}
            rowsPerPageOptions={[...PAGE_SIZES]}
            onPageChange={(_, p) => change({ page: p })}
            onRowsPerPageChange={(e) => change({ size: Number(e.target.value) })}
            labelRowsPerPage="На странице"
          />
        </>
      )}
    </Stack>
  )
}

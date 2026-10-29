import { CircularProgress, Stack, Table, TableBody, TableCell, TableHead, TablePagination, TableRow, Typography } from '@mui/material'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { auditApi } from '../../api/endpoints/audit'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'

const SIZES = [25, 50, 100]

export function AuditPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(0, Number(params.get('page')) || 0)
  const size = SIZES.includes(Number(params.get('size'))) ? Number(params.get('size')) : 50
  const query = useQuery({ queryKey: ['audit', page, size], queryFn: () => auditApi.list(page, size), placeholderData: keepPreviousData })

  function setPaging(nextPage: number, nextSize = size) {
    setParams(new URLSearchParams({ page: String(nextPage), size: String(nextSize) }))
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h1">Журнал аудита</Typography>
      {query.isPending && <CircularProgress aria-label="Загрузка" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.items.length === 0 && <EmptyState message="Событий нет" />}
      {query.data && query.data.items.length > 0 && (
        <>
          <Table size="small" aria-label="События аудита">
            <TableHead>
              <TableRow>
                <TableCell>Время</TableCell>
                <TableCell>Действие</TableCell>
                <TableCell>Объект</TableCell>
                <TableCell>Пользователь</TableCell>
                <TableCell>Детали</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.items.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{new Date(e.createdAt).toLocaleString('ru-RU')}</TableCell>
                  <TableCell>{e.action}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{e.subjectType ? `${e.subjectType} ${e.subjectId ?? ''}` : '—'}</TableCell>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{e.actorId ?? 'система'}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                    {e.details ? JSON.stringify(e.details) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={query.data.total}
            page={page}
            rowsPerPage={size}
            rowsPerPageOptions={SIZES}
            onPageChange={(_, p) => setPaging(p)}
            onRowsPerPageChange={(e) => setPaging(0, Number(e.target.value))}
            labelRowsPerPage="На странице"
          />
        </>
      )}
    </Stack>
  )
}

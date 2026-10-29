import { zodResolver } from '@hookform/resolvers/zod'
import {
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { targetsApi } from '../../api/endpoints/targets'
import { describeError, isApiError } from '../../api/errors'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { targetStatusColor, targetStatusLabel } from './labels'

const schema = z.object({
  name: z.string().trim().min(1, 'Введите название').max(100, 'Не более 100 символов'),
  baseUrl: z
    .string()
    .trim()
    .min(1, 'Введите адрес')
    .max(300, 'Не более 300 символов')
    .refine((v) => /^https?:\/\/[^\s/]+/i.test(v), 'Адрес должен начинаться с http:// или https://'),
})
type FormValues = z.infer<typeof schema>

function CreateTargetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', baseUrl: '' } })

  const mutation = useMutation({
    mutationFn: (values: FormValues) => targetsApi.create(values),
    onSuccess: (target) => {
      void queryClient.invalidateQueries({ queryKey: ['targets'] })
      notify('Цель добавлена. Подтвердите владение сайтом.', 'success')
      reset()
      onClose()
      void navigate(`/targets/${target.id}`)
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'SCOPE_VIOLATION') {
        setError('baseUrl', { message: 'Этот адрес запрещён политикой безопасности (внутренние и служебные адреса не сканируются)' })
      } else if (isApiError(e) && e.fieldErrors.length) {
        e.fieldErrors.forEach((f) => {
          if (f.field === 'name' || f.field === 'baseUrl') setError(f.field, { message: f.message })
        })
      } else {
        notify(describeError(e), 'error')
      }
    },
  })

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="create-target-title">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogTitle id="create-target-title">Новая цель</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Название" {...register('name')} error={!!errors.name} helperText={errors.name?.message} autoFocus />
            <TextField
              label="Адрес (base URL)"
              placeholder="https://app.example.kz"
              {...register('baseUrl')}
              error={!!errors.baseUrl}
              helperText={errors.baseUrl?.message ?? 'Сканируются только хосты этого адреса'}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>Добавить</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export function TargetsPage() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(20)
  const [creating, setCreating] = useState(false)
  const query = useQuery({ queryKey: ['targets', page, size], queryFn: () => targetsApi.list(page, size) })

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" component="h1">Цели</Typography>
        <Button variant="contained" onClick={() => setCreating(true)}>Добавить цель</Button>
      </Stack>

      {query.isPending && <CircularProgress aria-label="Загрузка" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.items.length === 0 && (
        <EmptyState message="Целей пока нет. Добавьте веб-приложение, которое вы вправе проверять." />
      )}
      {query.data && query.data.items.length > 0 && (
        <>
          <Table size="small" aria-label="Список целей">
            <TableHead>
              <TableRow>
                <TableCell>Название</TableCell>
                <TableCell>Адрес</TableCell>
                <TableCell>Статус</TableCell>
                <TableCell>Добавлена</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {query.data.items.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Link component={RouterLink} to={`/targets/${t.id}`}>{t.name}</Link>
                  </TableCell>
                  <TableCell>{t.baseUrl}</TableCell>
                  <TableCell>
                    <Chip size="small" label={targetStatusLabel[t.status]} color={targetStatusColor[t.status]} />
                  </TableCell>
                  <TableCell>{new Date(t.createdAt).toLocaleString('ru-RU')}</TableCell>
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
            onPageChange={(_, p) => setPage(p)}
            onRowsPerPageChange={(e) => {
              setSize(Number(e.target.value))
              setPage(0)
            }}
            labelRowsPerPage="На странице"
          />
        </>
      )}
      <CreateTargetDialog open={creating} onClose={() => setCreating(false)} />
    </Stack>
  )
}

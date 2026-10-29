import { zodResolver } from '@hookform/resolvers/zod'
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
import { endpointsApi } from '../../api/endpoints/targets'
import { describeError, isApiError } from '../../api/errors'
import type { Endpoint, ImportResult } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { LOCATIONS, METHODS, locationLabel } from './labels'

export const MAX_OPENAPI_BYTES = 2 * 1024 * 1024

const scopeMessages = {
  SCOPE_VIOLATION: 'Адрес выходит за пределы цели: допускаются только хосты и порты из base URL',
  PAYLOAD_TOO_LARGE: 'Документ слишком большой (максимум 2 МБ)',
}

const schema = z.object({
  method: z.enum(METHODS),
  url: z.string().trim().min(1, 'Введите URL').max(2000, 'Не более 2000 символов'),
  label: z.string().trim().max(100, 'Не более 100 символов').optional(),
  idempotent: z.boolean(),
  parameters: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Введите имя'),
        location: z.enum(LOCATIONS),
        sampleValue: z.string().optional(),
      }),
    )
    .max(50, 'Не более 50 параметров'),
})
type FormValues = z.infer<typeof schema>

function AddEndpointDialog({ targetId, open, onClose }: { targetId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { method: 'GET', url: '', label: '', idempotent: true, parameters: [] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'parameters' })

  const mutation = useMutation({
    mutationFn: (v: FormValues) =>
      endpointsApi.create(targetId, {
        method: v.method,
        url: v.url,
        label: v.label || undefined,
        idempotent: v.idempotent,
        parameters: v.parameters.map((p) => ({ name: p.name, location: p.location, sampleValue: p.sampleValue || null })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['endpoints', targetId] })
      notify('Endpoint добавлен', 'success')
      reset()
      onClose()
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'SCOPE_VIOLATION') setError('url', { message: scopeMessages.SCOPE_VIOLATION })
      else notify(describeError(e), 'error')
    },
  })

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="add-endpoint-title">
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
        <DialogTitle id="add-endpoint-title">Новый endpoint</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                name="method"
                control={control}
                render={({ field }) => (
                  <TextField select label="Метод" sx={{ minWidth: 120 }} {...field}>
                    {METHODS.map((m) => (
                      <MenuItem key={m} value={m}>{m}</MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <TextField
                label="URL"
                fullWidth
                placeholder="https://app.example.kz/api/orders/1"
                {...register('url')}
                error={!!errors.url}
                helperText={errors.url?.message}
              />
            </Stack>
            <TextField label="Название (необязательно)" {...register('label')} error={!!errors.label} helperText={errors.label?.message} />
            <Controller
              name="idempotent"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Checkbox checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Безопасен для повторных запросов (идемпотентный)"
                />
              )}
            />
            <Typography variant="subtitle2">Параметры</Typography>
            {fields.map((f, i) => (
              <Stack key={f.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
                <TextField
                  label="Имя"
                  size="small"
                  {...register(`parameters.${i}.name`)}
                  error={!!errors.parameters?.[i]?.name}
                  helperText={errors.parameters?.[i]?.name?.message}
                />
                <Controller
                  name={`parameters.${i}.location`}
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Расположение" size="small" sx={{ minWidth: 140 }} {...field}>
                      {LOCATIONS.map((l) => (
                        <MenuItem key={l} value={l}>{locationLabel[l]}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <TextField label="Пример значения" size="small" {...register(`parameters.${i}.sampleValue`)} />
                <Button color="error" onClick={() => remove(i)} aria-label={`Удалить параметр ${i + 1}`}>Убрать</Button>
              </Stack>
            ))}
            <div>
              <Button onClick={() => append({ name: '', location: 'QUERY', sampleValue: '' })}>Добавить параметр</Button>
            </div>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={mutation.isPending}>Отмена</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>Сохранить</Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

function ImportDialog({ targetId, baseUrl, open, onClose }: { targetId: string; baseUrl?: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [serverUrl, setServerUrl] = useState(baseUrl ?? '')
  const [document, setDocument] = useState<unknown>(null)
  const [fileName, setFileName] = useState('')
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)

  const mutation = useMutation({
    mutationFn: () => endpointsApi.importOpenApi(targetId, document, serverUrl.trim()),
    onSuccess: (r) => {
      setResult(r)
      void queryClient.invalidateQueries({ queryKey: ['endpoints', targetId] })
      notify(`Импортировано: ${r.created}`, 'success')
    },
    onError: (e) => notify(describeError(e, scopeMessages), 'error'),
  })

  async function onFile(file: File | undefined) {
    setFileError(null)
    setDocument(null)
    setResult(null)
    if (!file) return
    setFileName(file.name)
    if (file.size > MAX_OPENAPI_BYTES) {
      setFileError('Файл больше 2 МБ — загрузка отменена')
      return
    }
    try {
      setDocument(JSON.parse(await readFileText(file)))
    } catch {
      setFileError('Файл не является корректным JSON (YAML пока не поддерживается)')
    }
  }

  const canSubmit = document !== null && serverUrl.trim().length > 0 && !mutation.isPending

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="import-title">
      <DialogTitle id="import-title">Импорт из OpenAPI</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Button component="label" variant="outlined">
            Выбрать файл (JSON, до 2 МБ)
            <input
              type="file"
              hidden
              accept=".json,application/json"
              data-testid="openapi-file"
              onChange={(e) => {
                void onFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </Button>
          {fileName && !fileError && <Typography variant="body2">Файл: {fileName}</Typography>}
          {fileError && <Alert severity="error">{fileError}</Alert>}
          <TextField
            label="Адрес сервера (serverUrl)"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            helperText="Относительные пути из документа будут добавлены к этому адресу"
          />
          {result && (
            <Alert severity={result.skipped.length ? 'warning' : 'success'}>
              Создано: {result.created}. Пропущено: {result.skipped.length}.
              {result.skipped.length > 0 && (
                <ul>
                  {result.skipped.slice(0, 20).map((s, i) => (
                    <li key={i}>{s.method} {s.path} — {s.reason}</li>
                  ))}
                </ul>
              )}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Закрыть</Button>
        <Button variant="contained" disabled={!canSubmit} onClick={() => mutation.mutate()}>Импортировать</Button>
      </DialogActions>
    </Dialog>
  )
}

export function EndpointsTab({ targetId, baseUrl }: { targetId: string; baseUrl?: string }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [toDelete, setToDelete] = useState<Endpoint | null>(null)
  const query = useQuery({ queryKey: ['endpoints', targetId], queryFn: () => endpointsApi.list(targetId) })

  const remove = useMutation({
    mutationFn: (id: string) => endpointsApi.remove(targetId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['endpoints', targetId] })
      notify('Endpoint удалён', 'success')
      setToDelete(null)
    },
    onError: (e) => {
      setToDelete(null)
      notify(describeError(e), 'error')
    },
  })

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={() => setAdding(true)}>Добавить endpoint</Button>
        <Button onClick={() => setImporting(true)}>Импорт из OpenAPI</Button>
      </Stack>
      {query.isPending && <CircularProgress aria-label="Загрузка" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.length === 0 && <EmptyState message="Endpoints не добавлены" />}
      {query.data && query.data.length > 0 && (
        <Table size="small" aria-label="Endpoints">
          <TableHead>
            <TableRow>
              <TableCell>Метод</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Параметры</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {query.data.map((e) => (
              <TableRow key={e.id}>
                <TableCell><Chip size="small" label={e.method} /></TableCell>
                <TableCell sx={{ wordBreak: 'break-all' }}>
                  {e.url}
                  {e.label && <Typography variant="caption" display="block" color="text.secondary">{e.label}</Typography>}
                </TableCell>
                <TableCell>
                  {e.parameters.map((p) => `${p.name} (${locationLabel[p.location]})`).join(', ') || '—'}
                </TableCell>
                <TableCell align="right">
                  <IconButton aria-label={`Удалить ${e.method} ${e.url}`} onClick={() => setToDelete(e)} size="small">✕</IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <AddEndpointDialog targetId={targetId} open={adding} onClose={() => setAdding(false)} />
      <ImportDialog key={String(importing)} targetId={targetId} baseUrl={baseUrl} open={importing} onClose={() => setImporting(false)} />
      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить endpoint?"
        message={toDelete ? `${toDelete.method} ${toDelete.url}` : ''}
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}

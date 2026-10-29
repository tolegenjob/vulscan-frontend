import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { identitiesApi } from '../../api/endpoints/targets'
import { describeError } from '../../api/errors'
import type { AuthType, Identity, Target } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { AUTH_TYPES, authTypeLabel, identityFields } from './labels'

function AddIdentityDialog({ targetId, open, onClose }: { targetId: string; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [label, setLabel] = useState('')
  const [role, setRole] = useState('')
  const [authType, setAuthType] = useState<AuthType>('FORM_LOGIN')
  const [config, setConfig] = useState<Record<string, string>>({})
  const [secret, setSecret] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fields = identityFields[authType]

  function resetAll() {
    setLabel('')
    setRole('')
    setAuthType('FORM_LOGIN')
    setConfig({})
    setSecret({})
    setErrors({})
  }

  const mutation = useMutation({
    mutationFn: () => identitiesApi.create(targetId, { label: label.trim(), role: role.trim(), authType, authConfig: config, secret }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['identities', targetId] })
      notify('Учётная запись сохранена. Секрет больше не отображается.', 'success')
      resetAll() // секрет удаляется из состояния формы сразу после сохранения
      onClose()
    },
    onError: (e) => {
      setSecret({}) // не оставляем введённый секрет в памяти формы после ошибки
      notify(describeError(e, { SCOPE_VIOLATION: 'URL входа выходит за пределы цели' }), 'error')
    },
  })

  function submit() {
    const next: Record<string, string> = {}
    if (!label.trim()) next.label = 'Введите название'
    if (!role.trim()) next.role = 'Введите роль'
    for (const f of fields.config) if (!config[f.key]?.trim()) next[`config.${f.key}`] = 'Обязательное поле'
    for (const f of fields.secret) if (!secret[f.key]?.trim()) next[`secret.${f.key}`] = 'Обязательное поле'
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="add-identity-title">
      <DialogTitle id="add-identity-title">Новая учётная запись</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }} component="form" onSubmit={(e) => { e.preventDefault(); submit() }} noValidate>
          <TextField label="Название" value={label} onChange={(e) => setLabel(e.target.value)} error={!!errors.label} helperText={errors.label} />
          <TextField
            label="Роль"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            error={!!errors.role}
            helperText={errors.role ?? 'Например: user, admin'}
          />
          <TextField
            select
            label="Способ авторизации"
            value={authType}
            onChange={(e) => {
              setAuthType(e.target.value as AuthType)
              setConfig({})
              setSecret({})
              setErrors({})
            }}
          >
            {AUTH_TYPES.map((t) => (
              <MenuItem key={t} value={t}>{authTypeLabel[t]}</MenuItem>
            ))}
          </TextField>
          {fields.config.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              value={config[f.key] ?? ''}
              onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
              error={!!errors[`config.${f.key}`]}
              helperText={errors[`config.${f.key}`]}
            />
          ))}
          {fields.secret.map((f) => (
            <TextField
              key={f.key}
              label={f.label}
              type="password"
              autoComplete="off"
              value={secret[f.key] ?? ''}
              onChange={(e) => setSecret({ ...secret, [f.key]: e.target.value })}
              error={!!errors[`secret.${f.key}`]}
              helperText={errors[`secret.${f.key}`] ?? 'Хранится в зашифрованном виде и больше не показывается'}
            />
          ))}
          <button type="submit" hidden />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Отмена</Button>
        <Button variant="contained" onClick={submit} disabled={mutation.isPending}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  )
}

export function IdentitiesTab({ target }: { target: Target }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Identity | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; detail: string }>>({})
  const query = useQuery({ queryKey: ['identities', target.id], queryFn: () => identitiesApi.list(target.id) })

  const remove = useMutation({
    mutationFn: (id: string) => identitiesApi.remove(target.id, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['identities', target.id] })
      void queryClient.invalidateQueries({ queryKey: ['access-rules', target.id] })
      notify('Учётная запись удалена', 'success')
      setToDelete(null)
    },
    onError: (e) => {
      setToDelete(null)
      notify(describeError(e), 'error')
    },
  })

  const test = useMutation({
    mutationFn: (id: string) => identitiesApi.testLogin(target.id, id),
    onSuccess: (r, id) => setTestResults((prev) => ({ ...prev, [id]: r })),
    onError: (e) =>
      notify(describeError(e, { CONFLICT: 'Проверка входа доступна только для подтверждённой цели' }), 'error'),
  })

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Для проверки IDOR нужны минимум две учётные записи с разными ролями или владельцами данных.
      </Typography>
      <div>
        <Button variant="contained" onClick={() => setAdding(true)}>Добавить учётную запись</Button>
      </div>
      {query.isPending && <CircularProgress aria-label="Загрузка" />}
      {query.isError && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.data && query.data.length === 0 && <EmptyState message="Учётные записи не добавлены" />}
      {query.data && query.data.length > 0 && (
        <Table size="small" aria-label="Учётные записи">
          <TableHead>
            <TableRow>
              <TableCell>Название</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Авторизация</TableCell>
              <TableCell>Секрет</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {query.data.map((i) => (
              <TableRow key={i.id}>
                <TableCell>{i.label}</TableCell>
                <TableCell>{i.role}</TableCell>
                <TableCell>{authTypeLabel[i.authType]}</TableCell>
                <TableCell>{i.hasSecret ? <Chip size="small" label="Сохранён" /> : <Chip size="small" color="warning" label="Нет" />}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
                    {testResults[i.id] && (
                      <Alert severity={testResults[i.id].ok ? 'success' : 'error'} sx={{ py: 0 }}>
                        {testResults[i.id].detail}
                      </Alert>
                    )}
                    <Button
                      size="small"
                      onClick={() => test.mutate(i.id)}
                      disabled={target.status !== 'VERIFIED' || (test.isPending && test.variables === i.id)}
                      title={target.status !== 'VERIFIED' ? 'Доступно после подтверждения цели' : undefined}
                    >
                      Проверить вход
                    </Button>
                    <Button size="small" color="error" onClick={() => setToDelete(i)} aria-label={`Удалить ${i.label}`}>Удалить</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {adding && <AddIdentityDialog targetId={target.id} open={adding} onClose={() => setAdding(false)} />}
      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить учётную запись?"
        message={toDelete ? `${toDelete.label} (${toDelete.role}). Связанные правила доступа тоже будут удалены.` : ''}
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}

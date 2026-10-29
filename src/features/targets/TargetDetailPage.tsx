import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { targetsApi } from '../../api/endpoints/targets'
import { describeError, isApiError } from '../../api/errors'
import type { Target } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { AccessRulesTab } from './AccessRulesTab'
import { EndpointsTab } from './EndpointsTab'
import { IdentitiesTab } from './IdentitiesTab'
import { targetStatusColor, targetStatusLabel } from './labels'

function VerificationPanel({ target }: { target: Target }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const { state } = useAuth()
  const isAdmin = state.status === 'authenticated' && state.user.role === 'ADMIN'

  const verify = useMutation({
    mutationFn: () => targetsApi.verify(target.id),
    onSuccess: (t) => {
      queryClient.setQueryData(['target', target.id], t)
      void queryClient.invalidateQueries({ queryKey: ['targets'] })
      notify('Владение подтверждено', 'success')
    },
    onError: (e) =>
      notify(
        describeError(e, {
          VERIFICATION_FAILED: 'Файл подтверждения не найден или содержит другой текст. Проверьте путь и содержимое.',
        }),
        'error',
      ),
  })
  const approve = useMutation({
    mutationFn: () => targetsApi.approve(target.id),
    onSuccess: (t) => {
      queryClient.setQueryData(['target', target.id], t)
      void queryClient.invalidateQueries({ queryKey: ['targets'] })
      notify('Цель подтверждена администратором', 'success')
    },
    onError: (e) => notify(describeError(e), 'error'),
  })

  if (target.status !== 'PENDING_VERIFICATION') return null
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <Typography gutterBottom>
        Сканирование доступно только после подтверждения, что вы управляете сайтом. Разместите файл по адресу{' '}
        <code>{target.verification ? `${target.baseUrl.replace(/\/+$/, '')}${target.verification.path}` : '—'}</code> с
        единственной строкой:
      </Typography>
      {target.verification && (
        <Box component="pre" sx={{ m: 0, mb: 1, p: 1, bgcolor: 'action.hover', overflowX: 'auto' }} data-testid="verification-token">
          {target.verification.expectedContent}
        </Box>
      )}
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={() => verify.mutate()} disabled={verify.isPending}>
          Проверить
        </Button>
        {isAdmin && (
          <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
            Подтвердить вручную (админ)
          </Button>
        )}
      </Stack>
    </Alert>
  )
}

export function TargetDetailPage() {
  const { id = '' } = useParams()
  const [tab, setTab] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const notify = useNotify()
  const query = useQuery({ queryKey: ['target', id], queryFn: () => targetsApi.get(id) })

  const remove = useMutation({
    mutationFn: () => targetsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['targets'] })
      notify('Цель удалена', 'success')
      void navigate('/targets')
    },
    onError: (e) => {
      setConfirmDelete(false)
      notify(describeError(e, { CONFLICT: 'Нельзя удалить цель, пока по ней идёт сканирование' }), 'error')
    },
  })

  if (query.isPending) return <CircularProgress aria-label="Загрузка" />
  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <ErrorState error={query.error} title="Цель не найдена" />
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  const target = query.data

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" component="h1">{target.name}</Typography>
          <Typography color="text.secondary">{target.baseUrl}</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={targetStatusLabel[target.status]} color={targetStatusColor[target.status]} />
          <Button color="error" onClick={() => setConfirmDelete(true)}>Удалить</Button>
        </Stack>
      </Stack>

      <VerificationPanel target={target} />

      <Paper variant="outlined">
        <Tabs value={tab} onChange={(_, v: number) => setTab(v)} aria-label="Разделы цели" variant="scrollable">
          <Tab label="Endpoints" />
          <Tab label="Учётные записи" />
          <Tab label="Правила доступа" />
        </Tabs>
        <Box sx={{ p: 2 }}>
          {tab === 0 && <EndpointsTab targetId={target.id} baseUrl={target.baseUrl} />}
          {tab === 1 && <IdentitiesTab target={target} />}
          {tab === 2 && <AccessRulesTab targetId={target.id} />}
        </Box>
      </Paper>

      <ConfirmDialog
        open={confirmDelete}
        title="Удалить цель?"
        message="Будут удалены endpoints, учётные записи и правила доступа. Результаты прошлых сканирований сохранятся."
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Stack>
  )
}

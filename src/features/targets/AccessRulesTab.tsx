import {
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
import { accessRulesApi, endpointsApi, identitiesApi } from '../../api/endpoints/targets'
import { describeError } from '../../api/errors'
import type { AccessRule, ExpectedAccess, Identity, Endpoint, ParamLocation, Sensitivity } from '../../api/types'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { LOCATIONS, expectedLabel, locationLabel, sensitivityLabel } from './labels'

function AddRuleDialog({
  targetId,
  endpoints,
  identities,
  onClose,
}: {
  targetId: string
  endpoints: Endpoint[]
  identities: Identity[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [endpointId, setEndpointId] = useState(endpoints[0]?.id ?? '')
  const [paramName, setParamName] = useState('')
  const [location, setLocation] = useState<ParamLocation>('PATH')
  const [idValue, setIdValue] = useState('')
  const [ownerId, setOwnerId] = useState(identities[0]?.id ?? '')
  const [sensitivity, setSensitivity] = useState<Sensitivity>('MEDIUM')
  const [markers, setMarkers] = useState('')
  const [access, setAccess] = useState<Record<string, ExpectedAccess>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () =>
      accessRulesApi.create(targetId, {
        endpointId,
        idParameter: { name: paramName.trim(), location },
        idValue: idValue.trim(),
        ownerIdentityId: ownerId,
        sensitivity,
        ownerMarkers: markers.split(',').map((m) => m.trim()).filter(Boolean),
        access: Object.entries(access).map(([identityId, expected]) => ({ identityId, expected })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-rules', targetId] })
      notify('Правило добавлено', 'success')
      onClose()
    },
    onError: (e) => notify(describeError(e), 'error'),
  })

  function submit() {
    const next: Record<string, string> = {}
    if (!endpointId) next.endpoint = 'Выберите endpoint'
    if (!paramName.trim()) next.param = 'Введите имя параметра'
    if (!idValue.trim()) next.idValue = 'Введите значение идентификатора'
    if (!ownerId) next.owner = 'Выберите владельца'
    setErrors(next)
    if (Object.keys(next).length === 0) mutation.mutate()
  }

  return (
    <Dialog open onClose={mutation.isPending ? undefined : onClose} fullWidth maxWidth="md" aria-labelledby="add-rule-title">
      <DialogTitle id="add-rule-title">Новое правило доступа</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField select label="Endpoint" value={endpointId} onChange={(e) => setEndpointId(e.target.value)} error={!!errors.endpoint} helperText={errors.endpoint}>
            {endpoints.map((e) => (
              <MenuItem key={e.id} value={e.id}>{e.method} {e.url}</MenuItem>
            ))}
          </TextField>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Параметр-идентификатор" value={paramName} onChange={(e) => setParamName(e.target.value)} error={!!errors.param} helperText={errors.param} fullWidth />
            <TextField select label="Расположение" value={location} onChange={(e) => setLocation(e.target.value as ParamLocation)} sx={{ minWidth: 160 }}>
              {LOCATIONS.map((l) => (
                <MenuItem key={l} value={l}>{locationLabel[l]}</MenuItem>
              ))}
            </TextField>
            <TextField label="Значение" value={idValue} onChange={(e) => setIdValue(e.target.value)} error={!!errors.idValue} helperText={errors.idValue} fullWidth />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField select label="Владелец объекта" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} error={!!errors.owner} helperText={errors.owner} fullWidth>
              {identities.map((i) => (
                <MenuItem key={i.id} value={i.id}>{i.label} ({i.role})</MenuItem>
              ))}
            </TextField>
            <TextField select label="Чувствительность" value={sensitivity} onChange={(e) => setSensitivity(e.target.value as Sensitivity)} sx={{ minWidth: 180 }}>
              {(Object.keys(sensitivityLabel) as Sensitivity[]).map((s) => (
                <MenuItem key={s} value={s}>{sensitivityLabel[s]}</MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Маркеры владельца в ответе"
            value={markers}
            onChange={(e) => setMarkers(e.target.value)}
            helperText="Через запятую: email, имя или другие значения, по которым видно данные владельца"
          />
          <Typography variant="subtitle2">Ожидаемый доступ учётных записей</Typography>
          {identities.map((i) => (
            <TextField
              key={i.id}
              select
              size="small"
              label={`${i.label} (${i.role})`}
              value={access[i.id] ?? ''}
              onChange={(e) => setAccess({ ...access, [i.id]: e.target.value as ExpectedAccess })}
            >
              {(Object.keys(expectedLabel) as ExpectedAccess[]).map((x) => (
                <MenuItem key={x} value={x}>{expectedLabel[x]}</MenuItem>
              ))}
            </TextField>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={mutation.isPending}>Отмена</Button>
        <Button variant="contained" onClick={submit} disabled={mutation.isPending}>Сохранить</Button>
      </DialogActions>
    </Dialog>
  )
}

export function AccessRulesTab({ targetId }: { targetId: string }) {
  const queryClient = useQueryClient()
  const notify = useNotify()
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<AccessRule | null>(null)
  const rules = useQuery({ queryKey: ['access-rules', targetId], queryFn: () => accessRulesApi.list(targetId) })
  const endpoints = useQuery({ queryKey: ['endpoints', targetId], queryFn: () => endpointsApi.list(targetId) })
  const identities = useQuery({ queryKey: ['identities', targetId], queryFn: () => identitiesApi.list(targetId) })

  const remove = useMutation({
    mutationFn: (id: string) => accessRulesApi.remove(targetId, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['access-rules', targetId] })
      notify('Правило удалено', 'success')
      setToDelete(null)
    },
    onError: (e) => {
      setToDelete(null)
      notify(describeError(e), 'error')
    },
  })

  const endpointById = new Map((endpoints.data ?? []).map((e) => [e.id, e]))
  const identityById = new Map((identities.data ?? []).map((i) => [i.id, i]))
  const ready = (endpoints.data?.length ?? 0) > 0 && (identities.data?.length ?? 0) > 0

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Правила описывают, кому принадлежит объект и кто вправе его видеть. Без них IDOR-модуль работает только по эвристикам.
      </Typography>
      <div>
        <Button variant="contained" disabled={!ready} onClick={() => setAdding(true)}>Добавить правило</Button>
        {!ready && !endpoints.isPending && !identities.isPending && (
          <Typography variant="caption" sx={{ ml: 2 }}>Сначала добавьте endpoints и учётные записи</Typography>
        )}
      </div>
      {(rules.isPending || endpoints.isPending || identities.isPending) && <CircularProgress aria-label="Загрузка" />}
      {rules.isError && <ErrorState error={rules.error} onRetry={() => void rules.refetch()} />}
      {rules.data && rules.data.length === 0 && <EmptyState message="Правил доступа нет" />}
      {rules.data && rules.data.length > 0 && (
        <Table size="small" aria-label="Правила доступа">
          <TableHead>
            <TableRow>
              <TableCell>Endpoint</TableCell>
              <TableCell>Идентификатор</TableCell>
              <TableCell>Владелец</TableCell>
              <TableCell>Чувствительность</TableCell>
              <TableCell>Доступ</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rules.data.map((r) => {
              const ep = endpointById.get(r.endpointId)
              return (
                <TableRow key={r.id}>
                  <TableCell sx={{ wordBreak: 'break-all' }}>{ep ? `${ep.method} ${ep.url}` : '—'}</TableCell>
                  <TableCell>{r.idParameter.name} = {r.idValue}</TableCell>
                  <TableCell>{identityById.get(r.ownerIdentityId)?.label ?? '—'}</TableCell>
                  <TableCell>{sensitivityLabel[r.sensitivity]}</TableCell>
                  <TableCell>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {r.access.map((a) => (
                        <Chip
                          key={a.identityId}
                          size="small"
                          label={`${identityById.get(a.identityId)?.label ?? '?'}: ${expectedLabel[a.expected]}`}
                        />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" color="error" onClick={() => setToDelete(r)} aria-label={`Удалить правило ${r.idParameter.name}=${r.idValue}`}>Удалить</Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
      {adding && endpoints.data && identities.data && (
        <AddRuleDialog targetId={targetId} endpoints={endpoints.data} identities={identities.data} onClose={() => setAdding(false)} />
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить правило?"
        message={toDelete ? `${toDelete.idParameter.name} = ${toDelete.idValue}` : ''}
        busy={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </Stack>
  )
}

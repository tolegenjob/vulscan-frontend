import {
  Alert,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { accessRulesApi, endpointsApi, identitiesApi, policiesApi, targetsApi } from '../../api/endpoints/targets'
import { scansApi } from '../../api/endpoints/scans'
import { describeError } from '../../api/errors'
import type { ModuleType } from '../../api/types'
import { ErrorState } from '../../components/ErrorState'
import { useNotify } from '../../components/Notifier'
import { ModuleSelector } from './ModuleSelector'
import { ScopeWarning } from './ScopeWarning'
import { MAX_ENDPOINTS, parseExcludes, toCreateScanInput, validateScanForm } from './scanSchema'

const createErrors = {
  TARGET_NOT_VERIFIED: 'Цель не подтверждена. Подтвердите владение сайтом на странице цели.',
  TOO_MANY_ACTIVE_SCANS: 'Дождитесь завершения активных сканирований',
  SCOPE_VIOLATION: 'Один из endpoints или путей выходит за пределы цели',
  PAYLOAD_TOO_LARGE: 'Запрос слишком большой: уменьшите число endpoints',
}

export function NewScanPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notify = useNotify()

  const [targetId, setTargetId] = useState(params.get('targetId') ?? '')
  const [modules, setModules] = useState<ModuleType[]>([])
  const [endpointIds, setEndpointIds] = useState<string[]>([])
  const [policyId, setPolicyId] = useState('')
  const [excludeText, setExcludeText] = useState('')
  const [xssStored, setXssStored] = useState(false)
  const [sqliTimeBased, setSqliTimeBased] = useState(false)
  const [idorIds, setIdorIds] = useState<string[] | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const targets = useQuery({ queryKey: ['targets', 0, 100], queryFn: () => targetsApi.list(0, 100) })
  const policies = useQuery({ queryKey: ['policies'], queryFn: policiesApi.list })
  const enabled = targetId !== ''
  const endpoints = useQuery({ queryKey: ['endpoints', targetId], queryFn: () => endpointsApi.list(targetId), enabled })
  const identities = useQuery({ queryKey: ['identities', targetId], queryFn: () => identitiesApi.list(targetId), enabled })
  const rules = useQuery({ queryKey: ['access-rules', targetId], queryFn: () => accessRulesApi.list(targetId), enabled })

  const target = targets.data?.items.find((t) => t.id === targetId)
  const policy = policies.data?.find((p) => p.id === policyId) ?? policies.data?.[0]
  const identityList = identities.data ?? []
  const idorSelected = idorIds ?? identityList.map((i) => i.id)

  const idorReason = !enabled
    ? 'Сначала выберите цель'
    : identities.isPending || rules.isPending
      ? 'Загрузка…'
      : identityList.length < 2
        ? 'Нужно минимум две учётные записи (сейчас ' + identityList.length + ')'
        : (rules.data?.length ?? 0) === 0
          ? 'Нужно хотя бы одно правило доступа'
          : undefined
  const disabledReasons: Partial<Record<ModuleType, string>> = { IDOR: idorReason }
  const activeModules = modules.filter((m) => !disabledReasons[m])

  const form = {
    targetId,
    policyId: policyId || policy?.id,
    modules: activeModules,
    endpointIds,
    xssStored,
    sqliTimeBased,
    idorIdentityIds: idorSelected,
    excludeText,
  }
  const errors = validateScanForm(form)
  const valid = Object.keys(errors).length === 0 && target?.status === 'VERIFIED'

  const create = useMutation({
    mutationFn: () => scansApi.create(toCreateScanInput(form)),
    onSuccess: (scan) => {
      notify('Сканирование запущено', 'success')
      void navigate(`/scans/${scan.id}`)
    },
    onError: (e) => notify(describeError(e, createErrors), 'error'),
  })

  function changeTarget(id: string) {
    setTargetId(id)
    setEndpointIds([])
    setModules([])
    setIdorIds(null)
    setConfirmed(false)
  }

  const allSelected = !!endpoints.data?.length && endpointIds.length === endpoints.data.length

  return (
    <Stack spacing={3} component="form" noValidate onSubmit={(e) => { e.preventDefault(); setShowErrors(true); if (valid && confirmed) create.mutate() }}>
      <Typography variant="h5" component="h1">Новое сканирование</Typography>

      {targets.isError && <ErrorState error={targets.error} onRetry={() => void targets.refetch()} />}
      <TextField
        select
        label="Цель"
        value={targetId}
        onChange={(e) => changeTarget(e.target.value)}
        error={showErrors && !!errors.target}
        helperText={showErrors ? errors.target : undefined}
        disabled={targets.isPending}
      >
        {(targets.data?.items ?? []).map((t) => (
          <MenuItem key={t.id} value={t.id} disabled={t.status !== 'VERIFIED'}>
            {t.name} — {t.baseUrl}
            {t.status !== 'VERIFIED' ? ' (не подтверждена)' : ''}
          </MenuItem>
        ))}
      </TextField>

      {target && target.status !== 'VERIFIED' && (
        <Alert severity="warning">Цель не подтверждена, сканирование недоступно.</Alert>
      )}

      {target?.status === 'VERIFIED' && (
        <>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <ModuleSelector selected={modules} onChange={setModules} disabledReasons={disabledReasons} />
            {showErrors && errors.modules && <Typography color="error" variant="caption">{errors.modules}</Typography>}
            {modules.includes('XSS') && (
              <FormControlLabel
                control={<Checkbox checked={xssStored} onChange={(e) => setXssStored(e.target.checked)} />}
                label="Проверять stored XSS (приложение сохранит тестовые данные)"
              />
            )}
            {modules.includes('SQLI') && (
              <>
                <FormControlLabel
                  control={<Checkbox checked={sqliTimeBased} onChange={(e) => setSqliTimeBased(e.target.checked)} />}
                  label="Time-based SQLi"
                />
                {sqliTimeBased && <Alert severity="info">Time-based проверки увеличивают нагрузку и длительность сканирования.</Alert>}
              </>
            )}
            {modules.includes('IDOR') && (
              <Stack sx={{ mt: 1 }}>
                <Typography variant="subtitle2">Учётные записи для IDOR</Typography>
                {identityList.map((i) => (
                  <FormControlLabel
                    key={i.id}
                    control={
                      <Checkbox
                        checked={idorSelected.includes(i.id)}
                        onChange={(e) =>
                          setIdorIds(e.target.checked ? [...idorSelected, i.id] : idorSelected.filter((x) => x !== i.id))
                        }
                      />
                    }
                    label={`${i.label} (${i.role})`}
                  />
                ))}
                {showErrors && errors.idor && <Typography color="error" variant="caption">{errors.idor}</Typography>}
              </Stack>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2">Endpoints</Typography>
              <Typography variant="body2" color={endpointIds.length > MAX_ENDPOINTS ? 'error' : 'text.secondary'} data-testid="endpoint-counter">
                Выбрано {endpointIds.length} из {MAX_ENDPOINTS}
              </Typography>
            </Stack>
            {endpoints.isPending && <CircularProgress aria-label="Загрузка endpoints" />}
            {endpoints.isError && <ErrorState error={endpoints.error} onRetry={() => void endpoints.refetch()} />}
            {endpoints.data && endpoints.data.length === 0 && (
              <Alert severity="info">У цели нет endpoints. Добавьте их на странице цели.</Alert>
            )}
            {endpoints.data && endpoints.data.length > 0 && (
              <Table size="small" aria-label="Выбор endpoints">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={endpointIds.length > 0 && !allSelected}
                        onChange={(e) => setEndpointIds(e.target.checked ? endpoints.data.map((x) => x.id) : [])}
                        inputProps={{ 'aria-label': 'Выбрать все endpoints' }}
                      />
                    </TableCell>
                    <TableCell>Метод</TableCell>
                    <TableCell>URL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {endpoints.data.map((ep) => (
                    <TableRow key={ep.id} hover>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={endpointIds.includes(ep.id)}
                          onChange={(e) =>
                            setEndpointIds(e.target.checked ? [...endpointIds, ep.id] : endpointIds.filter((x) => x !== ep.id))
                          }
                          inputProps={{ 'aria-label': `${ep.method} ${ep.url}` }}
                        />
                      </TableCell>
                      <TableCell>{ep.method}</TableCell>
                      <TableCell sx={{ wordBreak: 'break-all' }}>{ep.url}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {showErrors && errors.endpoints && <Typography color="error" variant="caption">{errors.endpoints}</Typography>}
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <TextField
                select
                label="Политика"
                value={policyId || policy?.id || ''}
                onChange={(e) => setPolicyId(e.target.value)}
                disabled={!policies.data?.length}
              >
                {(policies.data ?? []).map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Исключить пути (по одному в строке)"
                multiline
                minRows={2}
                value={excludeText}
                onChange={(e) => setExcludeText(e.target.value)}
                placeholder="/logout&#10;/admin/delete"
                error={showErrors && !!errors.excludes}
                helperText={showErrors ? errors.excludes : 'Запросы к этим префиксам отправляться не будут'}
              />
            </Stack>
          </Paper>

          <ScopeWarning
            baseUrl={target.baseUrl}
            excluded={parseExcludes(excludeText)}
            policy={policy}
            confirmed={confirmed}
            onConfirmedChange={setConfirmed}
          />

          <div>
            <Button type="submit" variant="contained" disabled={!confirmed || create.isPending}>
              Запустить сканирование
            </Button>
          </div>
        </>
      )}
    </Stack>
  )
}

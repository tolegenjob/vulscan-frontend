import { Alert, Checkbox, FormControlLabel, Typography } from '@mui/material'
import type { Policy } from '../../api/types'

interface Props {
  baseUrl: string
  excluded: string[]
  policy?: Policy
  confirmed: boolean
  onConfirmedChange: (value: boolean) => void
}

export function ScopeWarning({ baseUrl, excluded, policy, confirmed, onConfirmedChange }: Props) {
  return (
    <Alert severity="warning" icon={false}>
      <Typography variant="subtitle2" gutterBottom>Что будет отправлено</Typography>
      <Typography variant="body2" gutterBottom>
        Сканирование отправляет тестовые запросы на адрес <strong>{baseUrl}</strong>. Продолжайте только для систем, на
        проверку которых у вас есть разрешение.
      </Typography>
      {excluded.length > 0 && (
        <Typography variant="body2" gutterBottom>Исключены пути: {excluded.join(', ')}</Typography>
      )}
      {policy && (
        <Typography variant="body2" gutterBottom>
          Ограничения политики «{policy.name}»: до {policy.limits.maxRequests} запросов, {policy.limits.requestsPerSecond} запросов/с,
          не более {policy.limits.maxConcurrency} параллельных.
        </Typography>
      )}
      <FormControlLabel
        control={<Checkbox checked={confirmed} onChange={(e) => onConfirmedChange(e.target.checked)} />}
        label="Я подтверждаю, что имею разрешение на проверку этой системы"
      />
    </Alert>
  )
}

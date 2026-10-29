import { Alert, AlertTitle, Button } from '@mui/material'
import { describeError } from '../api/errors'

export function ErrorState({ error, onRetry, title = 'Не удалось загрузить данные' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <Alert
      severity="error"
      role="alert"
      action={onRetry ? <Button color="inherit" size="small" onClick={onRetry}>Повторить</Button> : undefined}
    >
      <AlertTitle>{title}</AlertTitle>
      {describeError(error)}
    </Alert>
  )
}

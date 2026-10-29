import { zodResolver } from '@hookform/resolvers/zod'
import { Alert, Box, Button, Container, Paper, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { isApiError } from '../../api/errors'
import { useAuth } from '../../auth/AuthContext'
import { useState } from 'react'

const schema = z.object({
  username: z.string().min(1, 'Введите логин').max(64, 'Не более 64 символов'),
  password: z.string().min(1, 'Введите пароль').max(128, 'Не более 128 символов'),
})
type Form = z.infer<typeof schema>

/** Допускаются только внутренние пути: защита от открытого редиректа. */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  return next
}

export function LoginPage() {
  const { state, login, sessionExpired } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } })

  if (state.status === 'authenticated') return <Navigate to={next} replace />

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values.username.trim(), values.password)
      navigate(next, { replace: true })
    } catch (e) {
      resetField('password')
      if (isApiError(e) && e.code === 'BAD_CREDENTIALS') setFormError('Неверный логин или пароль')
      else if (isApiError(e) && e.status === 429) {
        setFormError(e.retryAfterSec ? `Слишком много попыток. Повторите через ${e.retryAfterSec} с` : 'Слишком много попыток. Повторите позже')
      } else if (isApiError(e) && e.code === 'NETWORK_ERROR') setFormError('Нет связи с сервером')
      else setFormError('Не удалось выполнить вход')
    }
  })

  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          Вход в VulScan
        </Typography>
        {sessionExpired && <Alert severity="info" sx={{ mb: 2 }}>Сессия истекла. Войдите снова.</Alert>}
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Логин"
            autoComplete="username"
            autoFocus
            error={!!errors.username}
            helperText={errors.username?.message}
            {...register('username')}
          />
          <TextField
            label="Пароль"
            type="password"
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            {...register('password')}
          />
          {formError && <Alert severity="error">{formError}</Alert>}
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Войти
          </Button>
        </Box>
      </Paper>
    </Container>
  )
}

import { Button, Container, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'

export function NotFoundPage({ message = 'Страница не найдена' }: { message?: string }) {
  return (
    <Container sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        {message}
      </Typography>
      <Button component={RouterLink} to="/">
        На главную
      </Button>
    </Container>
  )
}

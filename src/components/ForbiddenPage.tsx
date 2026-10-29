import { Container, Typography } from '@mui/material'

export function ForbiddenPage() {
  return (
    <Container sx={{ py: 8, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        Нет доступа
      </Typography>
      <Typography color="text.secondary">У вас недостаточно прав для просмотра этой страницы.</Typography>
    </Container>
  )
}

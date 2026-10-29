import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { Link as RouterLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Layout() {
  const { state, logout } = useAuth()
  const user = state.status === 'authenticated' ? state.user : null
  return (
    <Box>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ mr: 2 }}>
            VulScan
          </Typography>
          <Button component={RouterLink} to="/">Обзор</Button>
          <Button component={RouterLink} to="/targets">Цели</Button>
          <Button component={RouterLink} to="/scans">Сканирования</Button>
          <Button component={RouterLink} to="/findings">Находки</Button>
          {user?.role === 'ADMIN' && <Button component={RouterLink} to="/audit">Аудит</Button>}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ mr: 1 }}>{user?.username}</Typography>
          <Button onClick={() => void logout()}>Выйти</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  )
}

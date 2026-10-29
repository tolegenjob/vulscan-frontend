import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <Box sx={{ textAlign: 'center', py: 6 }}>
      <Typography color="text.secondary" gutterBottom>
        {message}
      </Typography>
      {action}
    </Box>
  )
}

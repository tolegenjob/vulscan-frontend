import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Удалить', busy, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onCancel} aria-labelledby="confirm-title">
      <DialogTitle id="confirm-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>Отмена</Button>
        <Button color="error" variant="contained" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  )
}

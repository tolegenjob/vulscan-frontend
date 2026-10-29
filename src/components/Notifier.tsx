import { Alert, Snackbar } from '@mui/material'
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Severity = 'success' | 'info' | 'warning' | 'error'
interface Notice {
  message: string
  severity: Severity
  key: number
}

const NotifierContext = createContext<(message: string, severity?: Severity) => void>(() => undefined)

export function NotifierProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<Notice | null>(null)
  const notify = useCallback((message: string, severity: Severity = 'info') => {
    setNotice({ message, severity, key: Date.now() })
  }, [])
  const value = useMemo(() => notify, [notify])
  return (
    <NotifierContext.Provider value={value}>
      {children}
      <Snackbar
        key={notice?.key}
        open={notice !== null}
        autoHideDuration={6000}
        onClose={() => setNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {notice ? (
          <Alert severity={notice.severity} onClose={() => setNotice(null)} variant="filled">
            {notice.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </NotifierContext.Provider>
  )
}

export const useNotify = () => useContext(NotifierContext)

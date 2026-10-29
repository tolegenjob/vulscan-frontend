import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../src/auth/AuthContext'
import { NotifierProvider } from '../src/components/Notifier'

export function renderWithProviders(ui: ReactElement, options: { route?: string; withAuth?: boolean } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  const content = (
    <QueryClientProvider client={queryClient}>
      <NotifierProvider>
        <MemoryRouter initialEntries={[options.route ?? '/']}>{ui}</MemoryRouter>
      </NotifierProvider>
    </QueryClientProvider>
  )
  return render(options.withAuth === false ? content : <AuthWrapper>{content}</AuthWrapper>)
}

function AuthWrapper({ children }: { children: ReactElement }) {
  return <AuthProvider>{children}</AuthProvider>
}

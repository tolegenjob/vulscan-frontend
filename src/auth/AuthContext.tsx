import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '../api/endpoints/auth'
import { setUnauthorizedHandler } from '../api/client'
import { isApiError } from '../api/errors'
import type { Me } from '../api/types'

type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: Me }

interface AuthContextValue {
  state: AuthState
  /** true, если сессия закончилась во время работы (а не пользователь вышел сам). */
  sessionExpired: boolean
  login: (username: string, password: string) => Promise<Me>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    let active = true
    authApi
      .me()
      .then((user) => active && setState({ status: 'authenticated', user }))
      .catch((e) => {
        if (!active) return
        // Любая ошибка при старте (в том числе сеть) оставляет пользователя на странице входа
        if (!isApiError(e)) console.error('Unexpected error while loading the session')
        setState({ status: 'anonymous' })
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState((current) => {
        if (current.status === 'authenticated') setSessionExpired(true)
        return { status: 'anonymous' }
      })
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const user = await authApi.login(username, password)
    setSessionExpired(false)
    setState({ status: 'authenticated', user })
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setSessionExpired(false)
      setState({ status: 'anonymous' })
    }
  }, [])

  const value = useMemo(() => ({ state, sessionExpired, login, logout }), [state, sessionExpired, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

export function useUser(): Me {
  const { state } = useAuth()
  if (state.status !== 'authenticated') throw new Error('User is not authenticated')
  return state.user
}

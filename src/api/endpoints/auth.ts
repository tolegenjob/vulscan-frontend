import { api } from '../client'
import type { Me } from '../types'

export const authApi = {
  login: (username: string, password: string) => api.post<Me>('/auth/login', { username, password }),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<Me>('/auth/me'),
}

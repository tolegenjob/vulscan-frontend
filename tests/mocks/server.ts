import { setupServer } from 'msw/node'

export const API = 'http://localhost/api/v1'
export const server = setupServer()

import type { AuthType, ExpectedAccess, ParamLocation, Sensitivity, TargetStatus } from '../../api/types'

export const targetStatusLabel: Record<TargetStatus, string> = {
  PENDING_VERIFICATION: 'Ожидает подтверждения',
  VERIFIED: 'Подтверждена',
  DISABLED: 'Отключена',
}

export const targetStatusColor: Record<TargetStatus, 'warning' | 'success' | 'default'> = {
  PENDING_VERIFICATION: 'warning',
  VERIFIED: 'success',
  DISABLED: 'default',
}

export const authTypeLabel: Record<AuthType, string> = {
  FORM_LOGIN: 'Форма входа (form)',
  JSON_LOGIN: 'Вход по JSON',
  BEARER_STATIC: 'Bearer-токен',
  COOKIE_STATIC: 'Cookie',
  HEADER_STATIC: 'Произвольный заголовок',
}

export const locationLabel: Record<ParamLocation, string> = {
  QUERY: 'query',
  BODY_FORM: 'body (form)',
  BODY_JSON: 'body (json)',
  PATH: 'path',
  HEADER: 'header',
  COOKIE: 'cookie',
}

export const sensitivityLabel: Record<Sensitivity, string> = { LOW: 'Низкая', MEDIUM: 'Средняя', HIGH: 'Высокая' }

export const expectedLabel: Record<ExpectedAccess, string> = {
  ALLOW: 'Разрешён',
  DENY: 'Запрещён',
  PUBLIC: 'Публичный',
}

/** Поля формы личности: что идёт в authConfig (открыто), что в secret (шифруется на сервере). */
export const identityFields: Record<AuthType, { config: { key: string; label: string }[]; secret: { key: string; label: string }[] }> = {
  FORM_LOGIN: {
    config: [
      { key: 'loginUrl', label: 'URL входа' },
      { key: 'usernameField', label: 'Имя поля логина' },
      { key: 'passwordField', label: 'Имя поля пароля' },
    ],
    secret: [
      { key: 'username', label: 'Логин' },
      { key: 'password', label: 'Пароль' },
    ],
  },
  JSON_LOGIN: {
    config: [
      { key: 'loginUrl', label: 'URL входа' },
      { key: 'usernameField', label: 'Имя поля логина' },
      { key: 'passwordField', label: 'Имя поля пароля' },
    ],
    secret: [
      { key: 'username', label: 'Логин' },
      { key: 'password', label: 'Пароль' },
    ],
  },
  BEARER_STATIC: { config: [], secret: [{ key: 'token', label: 'Токен' }] },
  COOKIE_STATIC: { config: [], secret: [{ key: 'cookie', label: 'Значение Cookie' }] },
  HEADER_STATIC: { config: [{ key: 'headerName', label: 'Имя заголовка' }], secret: [{ key: 'value', label: 'Значение' }] },
}

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const
export const LOCATIONS = ['QUERY', 'BODY_FORM', 'BODY_JSON', 'PATH', 'HEADER', 'COOKIE'] as const
export const AUTH_TYPES = ['FORM_LOGIN', 'JSON_LOGIN', 'BEARER_STATIC', 'COOKIE_STATIC', 'HEADER_STATIC'] as const

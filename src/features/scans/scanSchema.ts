import { z } from 'zod'
import type { CreateScanInput, ModuleType } from '../../api/types'

export const MAX_ENDPOINTS = 200
export const MAX_EXCLUDES = 50

export interface ScanForm {
  targetId: string
  policyId?: string
  modules: ModuleType[]
  endpointIds: string[]
  xssStored: boolean
  sqliTimeBased: boolean
  idorIdentityIds: string[]
  excludeText: string
}

export function parseExcludes(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

const excludesSchema = z
  .array(z.string().max(300).startsWith('/', 'Путь должен начинаться с «/»'))
  .max(MAX_EXCLUDES, `Не более ${MAX_EXCLUDES} путей`)

/** Проверка формы до отправки: возвращает сообщения по полям. */
export function validateScanForm(f: ScanForm): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!f.targetId) errors.target = 'Выберите цель'
  if (f.modules.length === 0) errors.modules = 'Выберите хотя бы один модуль'
  if (f.endpointIds.length === 0) errors.endpoints = 'Выберите хотя бы один endpoint'
  if (f.endpointIds.length > MAX_ENDPOINTS) errors.endpoints = `Не более ${MAX_ENDPOINTS} endpoints за одно сканирование`
  if (f.modules.includes('IDOR') && f.idorIdentityIds.length < 2) errors.idor = 'Для IDOR выберите минимум две учётные записи'
  const excludes = excludesSchema.safeParse(parseExcludes(f.excludeText))
  if (!excludes.success) errors.excludes = excludes.error.issues[0].message
  return errors
}

/** Тело POST /scans (раздел B.9): блоки модулей добавляются только для выбранных модулей. */
export function toCreateScanInput(f: ScanForm): CreateScanInput {
  const input: CreateScanInput = {
    targetId: f.targetId,
    modules: f.modules,
    endpointIds: f.endpointIds,
    excludePrefixes: parseExcludes(f.excludeText),
  }
  if (f.policyId) input.policyId = f.policyId
  if (f.modules.includes('XSS')) input.xss = { reflected: true, stored: f.xssStored, allowStore: f.xssStored }
  if (f.modules.includes('SQLI')) input.sqli = { errorBased: true, booleanBased: true, timeBased: f.sqliTimeBased }
  if (f.modules.includes('IDOR')) input.idor = { identityIds: f.idorIdentityIds }
  return input
}

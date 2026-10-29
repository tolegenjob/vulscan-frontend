// Типы повторяют DTO Core (api/dto/*). Единственный источник правды — серверные классы;
// при изменении API сначала обновляется Core, затем этот файл.

export type Role = 'USER' | 'ADMIN'
export type ModuleType = 'XSS' | 'SQLI' | 'IDOR'
export type Severity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type Verdict = 'SUSPECTED' | 'LIKELY' | 'CONFIRMED'
export type TriageStatus = 'OPEN' | 'FALSE_POSITIVE' | 'FIXED'
export type VulnType =
  | 'XSS_REFLECTED'
  | 'XSS_STORED'
  | 'SQLI_ERROR_BASED'
  | 'SQLI_BOOLEAN_BASED'
  | 'SQLI_TIME_BASED'
  | 'IDOR_HORIZONTAL'
  | 'IDOR_VERTICAL'
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'
export type ParamLocation = 'QUERY' | 'BODY_FORM' | 'BODY_JSON' | 'PATH' | 'HEADER' | 'COOKIE'
export type AuthType = 'FORM_LOGIN' | 'JSON_LOGIN' | 'BEARER_STATIC' | 'COOKIE_STATIC' | 'HEADER_STATIC'
export type TargetStatus = 'PENDING_VERIFICATION' | 'VERIFIED' | 'DISABLED'
export type ScanStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'FAILED' | 'CANCELLING' | 'CANCELLED'
export type JobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
export type ResultIntegrity = 'OK' | 'INCOMPLETE'
export type Sensitivity = 'LOW' | 'MEDIUM' | 'HIGH'
export type ExpectedAccess = 'ALLOW' | 'DENY' | 'PUBLIC'

export interface Me {
  id: string
  username: string
  role: Role
  csrfToken?: string
}

export interface Page<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export interface AllowedHost {
  host: string
  ports: number[]
}

export interface VerificationInfo {
  method: string
  path: string
  expectedContent: string
}

export interface Target {
  id: string
  ownerId: string
  name: string
  baseUrl: string
  status: TargetStatus
  allowedHosts: AllowedHost[]
  verification: VerificationInfo | null
  verifiedAt: string | null
  createdAt: string
}

export interface ParameterRef {
  name: string
  location: ParamLocation
  sampleValue?: string | null
}

export interface Endpoint {
  id: string
  method: HttpMethod
  url: string
  parameters: ParameterRef[]
  idempotent: boolean
  label: string | null
}

export interface CreateEndpointInput {
  method: HttpMethod
  url: string
  parameters: ParameterRef[]
  idempotent: boolean
  label?: string
}

export interface ImportResult {
  created: number
  skipped: { path: string; method: string; reason: string }[]
}

export interface Identity {
  id: string
  label: string
  role: string
  authType: AuthType
  authConfig: Record<string, string>
  hasSecret: boolean
}

export interface CreateIdentityInput {
  label: string
  role: string
  authType: AuthType
  authConfig: Record<string, string>
  secret: Record<string, string>
}

export interface ParameterId {
  name: string
  location: ParamLocation
}

export interface AccessRuleRef {
  identityId: string
  expected: ExpectedAccess
}

export interface AccessRule {
  id: string
  endpointId: string
  idParameter: ParameterId
  idValue: string
  ownerIdentityId: string
  sensitivity: Sensitivity
  ownerMarkers: string[]
  access: AccessRuleRef[]
}

export type AccessRuleInput = Omit<AccessRule, 'id'>

export interface ScanLimits {
  maxRequests: number
  requestsPerSecond: number
  maxConcurrency: number
  httpTimeoutMs: number
  maxResponseBytes: number
  maxDurationSec: number
}

export interface Policy {
  id: string
  name: string
  limits: ScanLimits
}

export interface ScanJob {
  id: string
  moduleType: ModuleType
  status: JobStatus
  attempt: number
  requestsSent: number
  endpointsDone: number
  errorCode: string | null
  errorMessage: string | null
  resultIntegrity: ResultIntegrity
  startedAt: string | null
  finishedAt: string | null
}

export interface Scan {
  id: string
  targetId: string
  policyId: string
  status: ScanStatus
  cancelRequested: boolean
  createdAt: string
  finishedAt: string | null
  jobs: ScanJob[]
  findingCounts: Record<Severity, number>
}

export interface ScanListItem {
  id: string
  targetId: string
  status: ScanStatus
  createdAt: string
  finishedAt: string | null
}

export interface CreateScanInput {
  targetId: string
  policyId?: string
  modules: ModuleType[]
  endpointIds: string[]
  xss?: { reflected?: boolean; stored?: boolean; allowStore?: boolean }
  sqli?: { errorBased?: boolean; booleanBased?: boolean; timeBased?: boolean }
  idor?: { identityIds: string[] }
  excludePrefixes?: string[]
}

export interface FindingListItem {
  id: string
  scanId: string
  targetId: string
  moduleType: ModuleType
  vulnType: VulnType
  verdict: Verdict
  severity: Severity
  confidence: number
  method: string
  url: string
  parameterName: string | null
  endpointId: string | null
  title: string
  triageStatus: TriageStatus
  createdAt: string
}

export interface Highlight {
  start: number
  end: number
}

export interface Evidence {
  request?: { method: string; url: string; headers?: Record<string, string>; bodyExcerpt?: string | null }
  response?: { status: number; headers?: Record<string, string>; bodyExcerpt?: string | null; highlights?: Highlight[] } | null
  observations?: { key: string; value: string }[]
}

export interface FindingDetail extends Omit<FindingListItem, 'parameterName'> {
  jobId: string
  fingerprint: string
  parameterName: string | null
  parameterLocation: string | null
  summary: string
  recommendation: string
  cwe: string
  details: Record<string, unknown>
  evidence: Evidence
}

export interface FindingFilters {
  scanId?: string
  targetId?: string
  moduleType?: ModuleType
  vulnType?: VulnType
  severity?: Severity
  verdict?: Verdict
  minConfidence?: number
  triageStatus?: TriageStatus
  endpoint?: string
  q?: string
  sort?: string
  page?: number
  size?: number
}

export interface DashboardSummary {
  openFindingsBySeverity: Record<Severity, number>
  openFindingsByModule: Record<ModuleType, number>
  openFindingsByVerdict: Record<Verdict, number>
  activeScans: number
  recentScans: ScanListItem[]
  avgScanDurationSec: number | null
}

export interface AuditEvent {
  id: string
  actorId: string | null
  action: string
  subjectType: string | null
  subjectId: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

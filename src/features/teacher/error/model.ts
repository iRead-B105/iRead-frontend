export type UiErrorKind =
  | 'network'
  | 'authentication'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'rate-limited'
  | 'validation'
  | 'server'
  | 'invalid-response'
  | 'unknown'

export type UiErrorAction = 'retry' | 'login' | 'back' | 'open-existing' | 'edit-input' | 'none'

export interface UiError {
  readonly kind: UiErrorKind
  readonly status: number | null
  readonly code: string | null
  readonly title: string
  readonly message: string
  readonly action: UiErrorAction
  readonly retryable: boolean
}

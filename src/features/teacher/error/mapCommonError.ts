import type { ApiError } from '@/lib/api/apiError'
import { isApiError } from '@/lib/api/apiError'
import { isAbortError } from '@/lib/api/isAbortError'
import type { UiError, UiErrorAction, UiErrorKind } from './model'

type UiErrorOverrideFields = Partial<
  Pick<UiError, 'kind' | 'title' | 'message' | 'action' | 'retryable'>
>

export type UiErrorOverride =
  | UiErrorOverrideFields
  | ((error: ApiError, defaultError: UiError) => UiErrorOverrideFields)

export type UiErrorOverrides = Readonly<Record<string, UiErrorOverride>>

export interface MapCommonErrorOptions {
  readonly overrides?: UiErrorOverrides
}

interface UiErrorInput {
  readonly kind: UiErrorKind
  readonly status: number | null
  readonly code: string | null
  readonly title: string
  readonly message: string
  readonly action: UiErrorAction
  readonly retryable: boolean
}

function createUiError(input: UiErrorInput): UiError {
  return { ...input }
}

function mapApiError(error: ApiError): UiError {
  const identity = {
    status: error.status,
    code: error.code,
  }

  if (error.code === 'INVALID_RESPONSE') {
    return createUiError({
      ...identity,
      kind: 'invalid-response',
      title: '응답을 확인할 수 없습니다',
      message: '서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      action: 'retry',
      retryable: true,
    })
  }

  if (error.status === 0) {
    return createUiError({
      ...identity,
      kind: 'network',
      title: '서버에 연결할 수 없습니다',
      message: '네트워크 연결을 확인한 뒤 다시 시도해 주세요.',
      action: 'retry',
      retryable: true,
    })
  }

  if (error.status === 400) {
    return createUiError({
      ...identity,
      kind: 'validation',
      title: '입력 내용을 확인해 주세요',
      message: '요청한 내용을 처리할 수 없습니다. 입력값을 다시 확인해 주세요.',
      action: 'edit-input',
      retryable: false,
    })
  }

  if (error.status === 401) {
    return createUiError({
      ...identity,
      kind: 'authentication',
      title: '다시 로그인이 필요합니다',
      message: '로그인 상태가 만료되었습니다. 다시 로그인해 주세요.',
      action: 'login',
      retryable: false,
    })
  }

  if (error.status === 403) {
    return createUiError({
      ...identity,
      kind: 'forbidden',
      title: '접근 권한이 없습니다',
      message: '이 정보에 접근할 권한이 없습니다.',
      action: 'back',
      retryable: false,
    })
  }

  if (error.status === 404) {
    return createUiError({
      ...identity,
      kind: 'not-found',
      title: '요청한 정보를 찾을 수 없습니다',
      message: '정보가 삭제되었거나 더 이상 사용할 수 없습니다.',
      action: 'back',
      retryable: false,
    })
  }

  if (error.status === 409) {
    return createUiError({
      ...identity,
      kind: 'conflict',
      title: '요청을 완료할 수 없습니다',
      message: '현재 상태와 요청이 충돌했습니다. 내용을 확인해 주세요.',
      action: 'none',
      retryable: false,
    })
  }

  if (error.status === 413) {
    return createUiError({
      ...identity,
      kind: 'validation',
      title: '파일 용량이 너무 큽니다',
      message: '허용된 용량보다 작은 파일을 선택해 주세요.',
      action: 'edit-input',
      retryable: false,
    })
  }

  if (error.status === 415) {
    return createUiError({
      ...identity,
      kind: 'validation',
      title: '지원하지 않는 파일 형식입니다',
      message: '허용된 형식의 파일을 선택해 주세요.',
      action: 'edit-input',
      retryable: false,
    })
  }

  if (error.status === 429) {
    return createUiError({
      ...identity,
      kind: 'rate-limited',
      title: '요청이 너무 많습니다',
      message: '잠시 후 다시 시도해 주세요.',
      action: 'retry',
      retryable: true,
    })
  }

  if (error.status >= 500) {
    return createUiError({
      ...identity,
      kind: 'server',
      title: '서버에서 요청을 처리하지 못했습니다',
      message: '잠시 후 다시 시도해 주세요.',
      action: 'retry',
      retryable: true,
    })
  }

  return createUiError({
    ...identity,
    kind: 'unknown',
    title: '요청을 처리하지 못했습니다',
    message: '잠시 후 다시 시도해 주세요.',
    action: 'retry',
    retryable: true,
  })
}

function applyOverride(
  error: ApiError,
  defaultError: UiError,
  overrides: UiErrorOverrides | undefined,
): UiError {
  if (!overrides || !Object.prototype.hasOwnProperty.call(overrides, error.code)) {
    return defaultError
  }

  const configuredOverride = overrides[error.code]
  if (!configuredOverride) {
    return defaultError
  }

  const override =
    typeof configuredOverride === 'function'
      ? configuredOverride(error, defaultError)
      : configuredOverride

  return {
    kind: override.kind ?? defaultError.kind,
    status: defaultError.status,
    code: defaultError.code,
    title: override.title ?? defaultError.title,
    message: override.message ?? defaultError.message,
    action: override.action ?? defaultError.action,
    retryable: override.retryable ?? defaultError.retryable,
  }
}

export function mapCommonError(
  error: unknown,
  options: MapCommonErrorOptions = {},
): UiError | null {
  if (isAbortError(error)) {
    return null
  }

  if (isApiError(error)) {
    const defaultError = mapApiError(error)
    return applyOverride(error, defaultError, options.overrides)
  }

  return createUiError({
    kind: 'unknown',
    status: null,
    code: null,
    title: '요청을 처리하지 못했습니다',
    message: '잠시 후 다시 시도해 주세요.',
    action: 'retry',
    retryable: true,
  })
}

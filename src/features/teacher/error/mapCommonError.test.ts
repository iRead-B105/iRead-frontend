import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/apiError'
import { mapCommonError, type UiErrorAction, type UiErrorKind } from '.'

interface ExpectedMapping {
  readonly status: number
  readonly code: string
  readonly kind: UiErrorKind
  readonly action: UiErrorAction
  readonly retryable: boolean
}

function apiError(status: number, code = `HTTP_${status}`): ApiError {
  return new ApiError({
    status,
    code,
    message: 'Backend에서 전달한 내부 오류 문구',
  })
}

describe('mapCommonError', () => {
  it.each<ExpectedMapping>([
    { status: 0, code: 'NETWORK_ERROR', kind: 'network', action: 'retry', retryable: true },
    {
      status: 400,
      code: 'VALIDATION_ERROR',
      kind: 'validation',
      action: 'edit-input',
      retryable: false,
    },
    {
      status: 401,
      code: 'UNAUTHORIZED',
      kind: 'authentication',
      action: 'login',
      retryable: false,
    },
    { status: 403, code: 'FORBIDDEN', kind: 'forbidden', action: 'back', retryable: false },
    {
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      kind: 'not-found',
      action: 'back',
      retryable: false,
    },
    { status: 409, code: 'CONFLICT', kind: 'conflict', action: 'none', retryable: false },
    { status: 413, code: 'HTTP_413', kind: 'validation', action: 'edit-input', retryable: false },
    { status: 415, code: 'HTTP_415', kind: 'validation', action: 'edit-input', retryable: false },
    {
      status: 429,
      code: 'LOGIN_RATE_LIMITED',
      kind: 'rate-limited',
      action: 'retry',
      retryable: true,
    },
    { status: 500, code: 'INTERNAL_ERROR', kind: 'server', action: 'retry', retryable: true },
  ])('$status $code를 $kind 오류로 변환한다', (expected) => {
    const result = mapCommonError(apiError(expected.status, expected.code))

    expect(result).toMatchObject(expected)
    expect(result?.message).not.toContain('Backend에서 전달한 내부 오류 문구')
  })

  it('HTTP status보다 INVALID_RESPONSE code를 우선한다', () => {
    const result = mapCommonError(apiError(200, 'INVALID_RESPONSE'))

    expect(result).toMatchObject({
      kind: 'invalid-response',
      status: 200,
      code: 'INVALID_RESPONSE',
      action: 'retry',
      retryable: true,
    })
  })

  it('알 수 없는 status에 안전한 기본 오류를 사용한다', () => {
    const result = mapCommonError(apiError(418))

    expect(result).toMatchObject({
      kind: 'unknown',
      status: 418,
      code: 'HTTP_418',
      action: 'retry',
      retryable: true,
    })
  })

  it('ApiError가 아닌 오류의 message를 노출하지 않는다', () => {
    const result = mapCommonError(new Error('민감한 내부 오류'))

    expect(result).toEqual({
      kind: 'unknown',
      status: null,
      code: null,
      title: '요청을 처리하지 못했습니다',
      message: '잠시 후 다시 시도해 주세요.',
      action: 'retry',
      retryable: true,
    })
  })

  it('기능별 code override를 status 기본값 위에 적용한다', () => {
    const result = mapCommonError(apiError(409, 'EMAIL_ALREADY_EXISTS'), {
      overrides: {
        EMAIL_ALREADY_EXISTS: {
          title: '이미 사용 중인 이메일입니다',
          message: '다른 이메일을 입력해 주세요.',
          action: 'edit-input',
        },
      },
    })

    expect(result).toEqual({
      kind: 'conflict',
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
      title: '이미 사용 중인 이메일입니다',
      message: '다른 이메일을 입력해 주세요.',
      action: 'edit-input',
      retryable: false,
    })
  })

  it('기능별 override callback에서도 실제 status와 code를 보존한다', () => {
    const result = mapCommonError(apiError(409, 'REPORT_PERIOD_ALREADY_EXISTS'), {
      overrides: {
        REPORT_PERIOD_ALREADY_EXISTS: (_error, defaultError) => ({
          title: '같은 기간의 보고서가 있습니다',
          message: `${defaultError.title} 기존 보고서를 확인해 주세요.`,
          action: 'open-existing',
        }),
      },
    })

    expect(result).toMatchObject({
      status: 409,
      code: 'REPORT_PERIOD_ALREADY_EXISTS',
      title: '같은 기간의 보고서가 있습니다',
      action: 'open-existing',
    })
  })

  it('AbortError는 사용자 표시 오류로 변환하지 않는다', () => {
    expect(mapCommonError(new DOMException('요청 취소', 'AbortError'))).toBeNull()
    expect(mapCommonError({ name: 'AbortError' })).toBeNull()
  })
})

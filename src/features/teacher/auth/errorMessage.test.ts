import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import { getLoginErrorMessage } from './errorMessage'

describe('getLoginErrorMessage', () => {
  it.each([
    [401, 'INVALID_CREDENTIALS', '이메일 또는 비밀번호가 일치하지 않습니다.'],
    [429, 'LOGIN_RATE_LIMITED', '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'],
    [0, 'NETWORK_ERROR', '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'],
    [500, 'INTERNAL_SERVER_ERROR', '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'],
  ])('%i %s 오류를 사용자 안내로 변환한다', (status, code, expected) => {
    expect(
      getLoginErrorMessage(
        new ApiError({
          status,
          code,
          message: '내부 오류 메시지',
        }),
      ),
    ).toBe(expected)
  })

  it('알 수 없는 일반 오류는 원본 메시지를 사용한다', () => {
    expect(getLoginErrorMessage(new Error('알 수 없는 오류'))).toBe('알 수 없는 오류')
  })
})

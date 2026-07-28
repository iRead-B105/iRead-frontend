import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api'
import {
  getLoginErrorMessage,
  getResetPasswordErrorMessage,
  getSignUpErrorMessage,
  getTeacherProfileErrorMessage,
} from './errorMessage'

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

describe('account recovery error messages', () => {
  it.each([
    [409, 'EMAIL_ALREADY_EXISTS', getSignUpErrorMessage, '이미 가입된 이메일입니다.'],
    [
      400,
      'INVALID_VERIFICATION_CODE',
      getResetPasswordErrorMessage,
      '검증 코드가 올바르지 않습니다.',
    ],
    [
      400,
      'DEMO_VERIFICATION_NOT_CONFIGURED',
      getResetPasswordErrorMessage,
      '비밀번호 재설정 검증 코드가 준비되지 않았습니다.',
    ],
    [
      404,
      'TEACHER_NOT_FOUND',
      getResetPasswordErrorMessage,
      '입력한 이메일과 일치하는 계정을 찾을 수 없습니다.',
    ],
  ])('%i %s 오류를 화면 안내로 변환한다', (status, code, mapper, expected) => {
    expect(
      mapper(
        new ApiError({
          status,
          code,
          message: '내부 오류 메시지',
        }),
      ),
    ).toBe(expected)
  })
})

describe('teacher profile error messages', () => {
  it.each([
    [413, 'PAYLOAD_TOO_LARGE', '허용된 용량보다 작은 파일을 선택해 주세요.'],
    [415, 'UNSUPPORTED_MEDIA_TYPE', '허용된 형식의 파일을 선택해 주세요.'],
  ])('%i 이미지 오류를 안전한 파일 안내로 변환한다', (status, code, expected) => {
    expect(
      getTeacherProfileErrorMessage(
        new ApiError({
          status,
          code,
          message: '내부 저장소 오류',
        }),
        'image',
      ),
    ).toBe(expected)
  })

  it('일반 오류의 원문 대신 안전한 공통 안내를 사용한다', () => {
    expect(getTeacherProfileErrorMessage(new Error('내부 저장소 오류'), 'save')).toBe(
      '잠시 후 다시 시도해 주세요.',
    )
  })
})

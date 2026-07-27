import { ApiError } from '@/lib/api'

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401 && error.code === 'INVALID_CREDENTIALS') {
      return '이메일 또는 비밀번호가 일치하지 않습니다.'
    }
    if (error.status === 429 && error.code === 'LOGIN_RATE_LIMITED') {
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (error.status === 0) {
      return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
    }
    if (error.status >= 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }
  }

  return error instanceof Error ? error.message : '로그인에 실패했습니다.'
}

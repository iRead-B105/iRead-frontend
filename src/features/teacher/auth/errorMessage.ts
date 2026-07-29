import { ApiError } from '@/lib/api'
import { mapCommonError } from '@/features/teacher/error'

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return '이메일 또는 비밀번호가 일치하지 않습니다.'
    }
    if (error.status === 429) {
      return '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (error.status === 0) {
      return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
    }
    if (error.status >= 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }

    return '로그인 요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.'
  }

  return error instanceof Error ? error.message : '로그인에 실패했습니다.'
}

export function getSignUpErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.code === 'EMAIL_ALREADY_EXISTS') {
      return '이미 가입된 이메일입니다.'
    }
    if (error.status === 0) {
      return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
    }
    if (error.status >= 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }

    return '회원가입 요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.'
  }

  return error instanceof Error ? error.message : '회원가입에 실패했습니다.'
}

export function getResetPasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400 && error.code === 'PASSWORD_RESET_TOKEN_INVALID') {
      return '비밀번호 재설정 링크가 올바르지 않거나 이미 사용되었습니다.'
    }
    if (error.status === 400 && error.code === 'PASSWORD_RESET_TOKEN_EXPIRED') {
      return '비밀번호 재설정 링크가 만료되었습니다. 새 링크를 요청해 주세요.'
    }
    if (error.status === 429 && error.code === 'PASSWORD_RESET_RATE_LIMITED') {
      return '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (error.status === 502 && error.code === 'PASSWORD_RESET_EMAIL_FAILED') {
      return '재설정 메일을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (error.status === 0) {
      return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
    }
    if (error.status >= 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }

    return '비밀번호 재설정 요청을 처리하지 못했습니다. 입력 내용을 확인해 주세요.'
  }

  return error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다.'
}

export type TeacherProfileErrorAction = 'load' | 'save' | 'image'

export function getTeacherProfileErrorMessage(
  error: unknown,
  action: TeacherProfileErrorAction,
): string {
  const fallback = {
    load: '프로필 정보를 불러오지 못했습니다.',
    save: '프로필 정보를 저장하지 못했습니다.',
    image: '프로필 사진을 저장하지 못했습니다.',
  }[action]

  if (error instanceof ApiError) {
    if (error.status === 0) {
      return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.'
    }
    if (error.status >= 500) {
      return '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
    }
    if (error.status === 413 || error.status === 415) {
      return mapCommonError(error)?.message ?? fallback
    }
    return fallback
  }

  return mapCommonError(error)?.message ?? fallback
}

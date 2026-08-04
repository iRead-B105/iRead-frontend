import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { ApiAuthRepository } from './apiAuthRepository'
import { ApiTeacherRepository } from './apiTeacherRepository'

describe('API auth repositories', () => {
  it('API 인증 실패를 샘플 성공 응답으로 대체하지 않는다', async () => {
    const apiError = new ApiError({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류',
    })
    const repository = new ApiAuthRepository({
      login: vi.fn().mockRejectedValue(apiError),
      signUp: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
    })

    await expect(
      repository.login({ email: 'teacher@example.com', password: 'password' }),
    ).rejects.toBe(apiError)
  })

  it('API 교수자 조회 실패를 샘플 데이터로 대체하지 않는다', async () => {
    const apiError = new ApiError({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류',
    })
    const repository = new ApiTeacherRepository({
      getInfo: vi.fn().mockRejectedValue(apiError),
      updateProfile: vi.fn(),
      updateProfileImage: vi.fn(),
    })

    await expect(repository.getInfo()).rejects.toBe(apiError)
  })
})

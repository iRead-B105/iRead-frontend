import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { ApiAuthRepository } from './apiAuthRepository'
import { ApiTeacherRepository } from './apiTeacherRepository'
import { createAuthRepositories } from '.'
import type { AuthRepository } from './authRepository'
import type { TeacherRepository } from './teacherRepository'

function createAuthRepository(): AuthRepository {
  return {
    login: vi.fn(),
    signUp: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    requestPasswordReset: vi.fn(),
    confirmPasswordReset: vi.fn(),
  }
}

function createTeacherRepository(): TeacherRepository {
  return {
    getInfo: vi.fn(),
    updateProfile: vi.fn(),
    updateProfileImage: vi.fn(),
  }
}

describe('auth repositories', () => {
  it('설정된 source에 해당하는 구현만 선택한다', () => {
    const apiAuth = createAuthRepository()
    const apiTeacher = createTeacherRepository()
    const mockAuth = createAuthRepository()
    const mockTeacher = createTeacherRepository()

    expect(
      createAuthRepositories('api', {
        apiAuth,
        apiTeacher,
        mockAuth,
        mockTeacher,
      }),
    ).toEqual({
      source: 'api',
      auth: apiAuth,
      teacher: apiTeacher,
    })
    expect(
      createAuthRepositories('mock', {
        apiAuth,
        apiTeacher,
        mockAuth,
        mockTeacher,
      }),
    ).toEqual({
      source: 'mock',
      auth: mockAuth,
      teacher: mockTeacher,
    })
  })

  it('API 인증 실패를 mock 성공으로 대체하지 않는다', async () => {
    const apiError = new ApiError({
      status: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: '서버 오류',
    })
    const api = {
      login: vi.fn().mockRejectedValue(apiError),
      signUp: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn(),
      requestPasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
    }
    const repository = new ApiAuthRepository(api)

    await expect(
      repository.login({
        email: 'teacher@example.com',
        password: 'password',
      }),
    ).rejects.toBe(apiError)
  })

  it('API 교수자 조회 실패를 mock fixture로 대체하지 않는다', async () => {
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

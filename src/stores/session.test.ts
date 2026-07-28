import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  AuthRepositories,
  AuthRepository,
  TeacherProfile,
  TeacherRepository,
} from '@/features/teacher/auth'
import { ApiError } from '@/lib/api'
import { useSessionStore } from './session'

const teacher: TeacherProfile = {
  email: 'teacher@example.com',
  name: '이OO 선생님',
  organization: 'iRead 학습센터',
  gender: 'FEMALE',
  profileImageUrl: '/images/teacher-profile.png',
}

function createRepositories(
  overrides: {
    source?: AuthRepositories['source']
    auth?: Partial<AuthRepository>
    teacher?: Partial<TeacherRepository>
  } = {},
): AuthRepositories {
  return {
    source: overrides.source ?? 'api',
    auth: {
      login: vi.fn().mockResolvedValue({
        accessToken: 'access-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }),
      signUp: vi.fn(),
      refresh: vi.fn().mockResolvedValue({
        accessToken: 'refreshed-token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }),
      logout: vi.fn().mockResolvedValue(undefined),
      resetPassword: vi.fn(),
      ...overrides.auth,
    },
    teacher: {
      getInfo: vi.fn().mockResolvedValue(teacher),
      updateProfile: vi.fn(),
      updateProfileImage: vi.fn(),
      ...overrides.teacher,
    },
  }
}

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    sessionStorage.clear()
  })

  it('세션을 확인하지 않은 unknown 상태로 시작한다', () => {
    const session = useSessionStore()

    expect(session.status).toBe('unknown')
    expect(session.authenticated).toBe(false)
    expect(session.accessToken).toBeNull()
    expect(session.teacher).toBeNull()
  })

  it('로그인 후 access token을 메모리에 저장하고 교수자 정보를 별도로 조회한다', async () => {
    const repositories = createRepositories()
    const session = useSessionStore()

    await expect(
      session.login(
        {
          email: 'teacher@example.com',
          password: 'password',
        },
        repositories,
      ),
    ).resolves.toBe(true)

    expect(repositories.auth.login).toHaveBeenCalledWith({
      email: 'teacher@example.com',
      password: 'password',
    })
    expect(repositories.teacher.getInfo).toHaveBeenCalledOnce()
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('access-token')
    expect(session.teacher).toEqual(teacher)
    expect(localStorage).toHaveLength(0)
    expect(sessionStorage).toHaveLength(0)
  })

  it('교수자 프로필 교체 시 인증 상태와 access token을 유지한다', () => {
    const session = useSessionStore()
    session.initialize(teacher, 'access-token')

    const updatedTeacher: TeacherProfile = {
      ...teacher,
      name: '박선생',
      organization: null,
    }
    session.replaceTeacherProfile(updatedTeacher)

    expect(session.teacher).toEqual(updatedTeacher)
    expect(session.teacher).not.toBe(updatedTeacher)
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('access-token')
  })

  it('로그인 후 교수자 정보 조회가 실패하면 불완전한 인증 상태를 남기지 않는다', async () => {
    const repositories = createRepositories({
      teacher: {
        getInfo: vi.fn().mockRejectedValue(new Error('교수자 조회 실패')),
      },
    })
    const session = useSessionStore()

    await expect(
      session.login(
        {
          email: 'teacher@example.com',
          password: 'password',
        },
        repositories,
      ),
    ).rejects.toThrow('교수자 조회 실패')

    expect(session.status).toBe('anonymous')
    expect(session.accessToken).toBeNull()
    expect(session.teacher).toBeNull()
  })

  it('refresh와 교수자 조회로 새로고침 세션을 복원한다', async () => {
    const repositories = createRepositories()
    const session = useSessionStore()

    await expect(session.restoreSession(repositories)).resolves.toBe(true)

    expect(repositories.auth.refresh).toHaveBeenCalledOnce()
    expect(repositories.teacher.getInfo).toHaveBeenCalledOnce()
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('refreshed-token')
    expect(session.teacher).toEqual(teacher)
  })

  it('동시에 요청한 세션 복원을 하나의 Promise로 처리한다', async () => {
    let resolveRefresh!: (value: {
      accessToken: string
      tokenType: 'Bearer'
      expiresIn: number
    }) => void
    const refreshResult = new Promise<{
      accessToken: string
      tokenType: 'Bearer'
      expiresIn: number
    }>((resolve) => {
      resolveRefresh = resolve
    })
    const repositories = createRepositories({
      auth: {
        refresh: vi.fn().mockReturnValue(refreshResult),
      },
    })
    const session = useSessionStore()

    const first = session.restoreSession(repositories)
    const second = session.restoreSession(repositories)
    resolveRefresh({
      accessToken: 'refreshed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    })

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(repositories.auth.refresh).toHaveBeenCalledOnce()
    expect(repositories.teacher.getInfo).toHaveBeenCalledOnce()
  })

  it('동시에 발생한 401에서 refresh를 한 번만 실행한다', async () => {
    let resolveRefresh!: (value: {
      accessToken: string
      tokenType: 'Bearer'
      expiresIn: number
    }) => void
    const refreshResult = new Promise<{
      accessToken: string
      tokenType: 'Bearer'
      expiresIn: number
    }>((resolve) => {
      resolveRefresh = resolve
    })
    const repositories = createRepositories({
      auth: {
        refresh: vi.fn().mockReturnValue(refreshResult),
      },
    })
    const session = useSessionStore()

    const first = session.handleUnauthorized(false, repositories)
    const second = session.handleUnauthorized(false, repositories)
    resolveRefresh({
      accessToken: 'refreshed-token',
      tokenType: 'Bearer',
      expiresIn: 900,
    })

    await expect(Promise.all([first, second])).resolves.toEqual([true, true])
    expect(repositories.auth.refresh).toHaveBeenCalledOnce()
    expect(session.accessToken).toBe('refreshed-token')
  })

  it('refresh 실패 또는 재시도 요청의 401에서 세션을 제거한다', async () => {
    const repositories = createRepositories({
      auth: {
        refresh: vi.fn().mockRejectedValue(new Error('refresh 실패')),
      },
    })
    const session = useSessionStore()
    session.initialize(teacher, 'expired-token')

    await expect(session.handleUnauthorized(false, repositories)).resolves.toBe(false)
    expect(session.status).toBe('anonymous')

    session.initialize(teacher, 'retried-token')
    await expect(session.handleUnauthorized(true, repositories)).resolves.toBe(false)
    expect(session.status).toBe('anonymous')
    expect(repositories.auth.refresh).toHaveBeenCalledOnce()
  })

  it('로그아웃 성공과 이미 만료된 세션 응답에서는 로컬 상태를 제거한다', async () => {
    const session = useSessionStore()
    const successRepositories = createRepositories()
    session.initialize(teacher, 'access-token')

    await expect(session.logout(successRepositories)).resolves.toBe(true)
    expect(session.status).toBe('anonymous')

    const expiredRepositories = createRepositories({
      auth: {
        logout: vi.fn().mockRejectedValue(
          new ApiError({
            status: 401,
            code: 'INVALID_REFRESH_TOKEN',
            message: '이미 만료된 세션입니다.',
          }),
        ),
      },
    })
    session.initialize(teacher, 'access-token')

    await expect(session.logout(expiredRepositories)).resolves.toBe(true)
    expect(session.status).toBe('anonymous')
  })

  it('로그아웃 네트워크 오류에서는 기존 로컬 세션을 유지한다', async () => {
    const repositories = createRepositories({
      auth: {
        logout: vi.fn().mockRejectedValue(
          new ApiError({
            status: 0,
            code: 'NETWORK_ERROR',
            message: '서버에 연결할 수 없습니다.',
          }),
        ),
      },
    })
    const session = useSessionStore()
    session.initialize(teacher, 'access-token')

    await expect(session.logout(repositories)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('access-token')
    expect(session.teacher).toEqual(teacher)
  })
})

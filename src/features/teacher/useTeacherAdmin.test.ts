import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTeacherAdminState } from './useTeacherAdmin'
import { AdminContractBlockedError, type TeacherAdminRepository } from './repositories'
import { useSessionStore } from '@/stores/session'

function createRepository(overrides: Partial<TeacherAdminRepository> = {}): TeacherAdminRepository {
  return {
    getTeacherInfo: vi.fn().mockResolvedValue({
      name: '이OO 선생님',
      email: 'teacher@example.com',
      organization: 'iRead 학습센터',
    }),
    listStudents: vi.fn().mockResolvedValue([
      {
        id: 1,
        name: '김OO',
        age: 10,
        recentLearningDate: '2026-07-18',
        totalLearningTime: 780,
        recentTraining: '문장 이해력 향상',
      },
    ]),
    logout: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('createTeacherAdminState', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('Repository 결과로 화면 상태와 전역 세션을 각각 초기화한다', async () => {
    const repository = createRepository()
    const state = createTeacherAdminState(repository)
    const session = useSessionStore()

    await state.loadAdminData()

    expect(state.students).toEqual([
      expect.objectContaining({
        id: 1,
        name: '김OO',
        totalLearningTime: '13시간',
      }),
    ])
    expect(session.authenticated).toBe(true)
    expect(session.teacher?.email).toBe('teacher@example.com')
    expect(state.loading.value).toBe(false)
  })

  it('계약상 식별자가 없는 API 아동 응답은 명시적으로 차단한다', async () => {
    const repository = createRepository({
      listStudents: vi.fn().mockResolvedValue([
        {
          id: null,
          name: '계약 아동',
          age: 9,
          recentLearningDate: null,
          totalLearningTime: 0,
          recentTraining: null,
        },
      ]),
    })
    const state = createTeacherAdminState(repository)
    const session = useSessionStore()

    await expect(state.loadAdminData()).rejects.toBeInstanceOf(AdminContractBlockedError)
    expect(state.students).toHaveLength(0)
    expect(session.authenticated).toBe(false)
    expect(state.loading.value).toBe(false)
  })

  it('레이아웃별 조회 상태를 모듈 전역으로 공유하지 않는다', async () => {
    const firstState = createTeacherAdminState(createRepository())
    const secondState = createTeacherAdminState(createRepository())

    await firstState.loadAdminData()

    expect(firstState.students).toHaveLength(1)
    expect(secondState.students).toHaveLength(0)
  })

  it('로그아웃 성공 후 세션과 조회 상태를 초기화한다', async () => {
    const repository = createRepository()
    const state = createTeacherAdminState(repository)
    const session = useSessionStore()
    await state.loadAdminData()

    await state.logout()

    expect(repository.logout).toHaveBeenCalledOnce()
    expect(session.authenticated).toBe(false)
    expect(session.teacher).toBeNull()
    expect(state.students).toHaveLength(0)
  })
})

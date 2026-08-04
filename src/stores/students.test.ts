import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StudentListItem,
  StudentListResult,
  StudentLearningSummary,
  StudentDetail,
  StudentRepository,
} from '@/features/teacher/student'
import { ApiError } from '@/lib/api'
import { useStudentStore } from './students'

const firstStudent: StudentListItem = {
  studentId: 1,
  name: '첫 학습자',
  school: '새봄초등학교',
  age: 8,
  imageUrl: null,
  recentTraining: null,
  recentLearningDate: null,
  weeklyScheduledCount: 0,
  weeklyCompletedCount: 0,
  weeklyParticipationRate: null,
  totalLearningMinutes: 0,
}

const firstStudentDetail: StudentDetail = {
  studentId: 1,
  name: '첫 학습자',
  birthday: '2018-03-15',
  gender: 'Boy',
  school: '새봄초등학교',
  guardian: '김보호',
  guardianContact: '010-0000-0001',
  guardianEmail: null,
  address: null,
  createdAt: '2026-03-01T09:00:00+09:00',
  imageUrl: null,
  teacherMemo: null,
}

const firstLearningSummary: StudentLearningSummary = {
  studentId: 1,
  currentStage: '문장 이해력 향상',
  lastLearningAt: '2026-07-27T16:00:00+09:00',
  attentionRequiredCount: 1,
  attentionReasons: ['LOW_ACCURACY'],
}

function result(
  students: readonly StudentListItem[],
  page = 0,
  totalElements = students.length,
  totalPages = students.length ? 1 : 0,
): StudentListResult {
  return {
    students,
    page,
    size: 10,
    totalElements,
    totalPages,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

const mutationRepositoryMethods = {
  getDetail: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  getLearningSummary: vi.fn(),
  listLearningEvents: vi.fn(),
  getLearningEvent: vi.fn(),
  getAccuracyTrend: vi.fn(),
  getReadingSpeedTrend: vi.fn(),
  getTrainingHistory: vi.fn(),
  updateTeacherMemo: vi.fn(),
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Student store', () => {
  it('keeps a resolved empty list visible during a background refresh', async () => {
    const pending = deferred<StudentListResult>()
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValueOnce(result([])).mockReturnValueOnce(pending.promise),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 0, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    await store.loadList()

    const refresh = store.refreshList()

    expect(store.listStatus).toBe('success')
    expect(store.students).toEqual([])
    pending.resolve(result([]))
    await expect(refresh).resolves.toBe(true)
    expect(store.listStatus).toBe('success')
  })

  it('목록 재조회 실패 시 기존 목록을 유지하고 서버 원문을 노출하지 않는다', async () => {
    const list = vi
      .fn()
      .mockResolvedValueOnce(result([firstStudent]))
      .mockRejectedValueOnce(
        new ApiError({
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'database connection details',
        }),
      )
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list,
      getSummary: vi.fn().mockResolvedValue({
        totalStudents: 1,
        scheduledTodayCount: 0,
      }),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await store.loadList()
    await store.loadList()

    expect(store.listStatus).toBe('error')
    expect(store.students).toEqual([firstStudent])
    expect(store.listError).toBe('잠시 후 다시 시도해 주세요.')
    expect(store.listError).not.toContain('database')
    expect(store.listUiError?.kind).toBe('server')
  })

  it('목록과 summary 실패 상태를 서로 독립적으로 관리한다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([firstStudent])),
      getSummary: vi.fn().mockRejectedValue(new Error('summary failed')),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await Promise.all([store.loadList(), store.loadSummary()])

    expect(store.listStatus).toBe('success')
    expect(store.students).toEqual([firstStudent])
    expect(store.summaryStatus).toBe('error')
    expect(store.students).toEqual([firstStudent])
  })

  it('느린 이전 목록 응답이 최신 검색 결과를 덮지 못한다', async () => {
    const first = deferred<StudentListResult>()
    const second = deferred<StudentListResult>()
    const newerStudent = { ...firstStudent, studentId: 2, name: '최신 학습자' }
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 2, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    const oldRequest = store.loadList()
    store.setListFilters({ keyword: '최신' })
    const newRequest = store.loadList()
    second.resolve(result([newerStudent]))
    await newRequest
    first.resolve(result([firstStudent]))
    await oldRequest

    expect(store.students).toEqual([newerStudent])
    expect(store.query.keyword).toBe('최신')
  })

  it('관리 목록과 Sidebar query·page 상태를 분리한다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi
        .fn()
        .mockImplementation((query = {}) =>
          Promise.resolve(
            result([{ ...firstStudent, studentId: (query.page ?? 0) + 1 }], query.page ?? 0, 20, 2),
          ),
        ),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 20, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    store.setListFilters({ keyword: '관리' })
    store.setListPage(1)

    await store.searchNavigation('선택기')
    const selectedBeforeNextPage = store.selectedStudentId
    await store.loadMoreNavigation()

    expect(store.query).toMatchObject({ keyword: '관리', page: 1 })
    expect(store.navigationQuery).toMatchObject({ keyword: '선택기', page: 1 })
    expect(store.navigationItems.map((student) => student.studentId)).toEqual([1, 2])
    expect(store.selectedStudentId).toBe(selectedBeforeNextPage)
  })

  it('Sidebar 목록을 불러와도 첫 학습자를 자동 선택하지 않는다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([firstStudent])),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 1, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await store.loadNavigation({ reset: true })

    expect(store.navigationItems).toHaveLength(1)
    expect(store.selectedStudentId).toBeNull()
  })

  it('Sidebar 검색 결과가 바뀌어도 선택한 학습자를 보존한다', async () => {
    const secondStudent = { ...firstStudent, studentId: 2, name: '둘째 학습자' }
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi
        .fn()
        .mockResolvedValueOnce(result([firstStudent, secondStudent]))
        .mockResolvedValueOnce(result([secondStudent])),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 2, scheduledTodayCount: 0 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    await store.loadNavigation({ reset: true })
    store.rememberStudent(firstStudent)

    await store.searchNavigation('둘째')

    expect(store.selectedStudentId).toBe(firstStudent.studentId)
    expect(store.navigationItemsById[firstStudent.studentId]?.name).toBe(firstStudent.name)
    expect(store.navigationItems.map((student) => student.studentId)).toEqual([2])
  })

  it('logout용 reset은 Student 상태만 비운다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([firstStudent])),
      getSummary: vi.fn().mockResolvedValue({ totalStudents: 1, scheduledTodayCount: 1 }),
    }
    const store = useStudentStore()
    store.setRepository(repository)
    await Promise.all([store.loadList(), store.loadNavigation({ reset: true })])

    store.reset()

    expect(store.students).toEqual([])
    expect(store.navigationItems).toEqual([])
    expect(store.listStatus).toBe('idle')
  })

  it('상세·학습 summary를 studentId별로 저장하고 메모 상태를 갱신한다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([firstStudent])),
      getSummary: vi.fn().mockResolvedValue({
        totalStudents: 1,
        scheduledTodayCount: 0,
      }),
      getDetail: vi.fn().mockResolvedValue(firstStudentDetail),
      getLearningSummary: vi.fn().mockResolvedValue(firstLearningSummary),
      updateTeacherMemo: vi.fn().mockResolvedValue(undefined),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await Promise.all([store.loadDetail(1), store.loadLearningSummary(1)])
    await store.saveTeacherMemo(1, '받침 읽기 연습 필요')

    expect(store.detailsById[1]?.teacherMemo).toBe('받침 읽기 연습 필요')
    expect(store.learningSummaryById[1]).toEqual(firstLearningSummary)
    expect(store.detailStatusById[1]).toBe('success')
    expect(store.learningSummaryStatusById[1]).toBe('success')
  })

  it('상세 접근 오류의 HTTP status를 studentId별로 보존한다', async () => {
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([])),
      getSummary: vi.fn().mockResolvedValue({
        totalStudents: 0,
        scheduledTodayCount: 0,
      }),
      getDetail: vi.fn().mockRejectedValue(
        new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: '접근 권한이 없습니다.',
        }),
      ),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await store.loadDetail(99)

    expect(store.detailStatusById[99]).toBe('error')
    expect(store.detailErrorStatusById[99]).toBe(403)
    expect(store.detailsById[99]).toBeUndefined()
  })

  it('이벤트·정확도·읽기 속도·기간별 훈련 이력을 독립된 studentId 상태로 저장한다', async () => {
    const learningEvent = {
      eventId: 701,
      eventType: 'TRAINING' as const,
      occurredAt: '2026-07-27T16:00:00+09:00',
      sourceId: 91,
      accuracy: 68,
      attentionRequired: true,
      attentionReasons: ['LOW_ACCURACY' as const],
    }
    const learningEventDetail = {
      ...learningEvent,
      retryCount: 2,
      problemSegments: ['받침 ㄹ 발음'],
      recommendedTrainingTemplateId: null,
      recommendedCurriculumUnitId: null,
      recommendedCurriculumUnitName: null,
      recommendationReason: null,
      recommendedMinutes: null,
      recommendedRepeatCount: null,
    }
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([])),
      getSummary: vi.fn().mockResolvedValue({
        totalStudents: 0,
        scheduledTodayCount: 0,
      }),
      listLearningEvents: vi.fn().mockResolvedValue([learningEvent]),
      getLearningEvent: vi.fn().mockResolvedValue(learningEventDetail),
      getAccuracyTrend: vi.fn().mockResolvedValue({
        dailyAccuracy: [{ date: '2026-07-27', accuracy: 68 }],
      }),
      getReadingSpeedTrend: vi.fn().mockResolvedValue({
        unit: 'CORRECT_WORDS_PER_MINUTE',
        changeRate: 8.5,
        points: [{ date: '2026-07-27', speed: 89 }],
      }),
      getTrainingHistory: vi.fn().mockResolvedValue({
        learningHistory: [
          {
            trainingId: 801,
            date: '2026-07-27',
            learningType: '문장 읽기',
            startedAt: null,
            finishedAt: null,
            achievement: 68,
          },
        ],
      }),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await Promise.all([
      store.loadLearningEvents(1, 3),
      store.loadAccuracyTrend(1),
      store.loadReadingSpeedTrend(1),
      store.loadTrainingHistory(1, '30d'),
    ])
    await store.loadLearningEvent(1, 'TRAINING', 701)

    expect(repository.listLearningEvents).toHaveBeenCalledWith(1, { limit: 3 })
    expect(repository.getLearningEvent).toHaveBeenCalledWith(1, 'TRAINING', 701)
    expect(store.learningEventsById[1]).toEqual([learningEvent])
    expect(store.learningEventDetailsByKey['1:TRAINING:701']).toEqual(learningEventDetail)
    expect(store.accuracyTrendById[1]?.dailyAccuracy).toHaveLength(1)
    expect(store.readingSpeedTrendById[1]?.points).toHaveLength(1)
    expect(store.trainingHistoryByKey['1:30d']?.learningHistory).toHaveLength(1)
  })

  it('느린 이전 읽기 속도 응답이 같은 아동의 최신 응답을 덮지 못한다', async () => {
    const first = deferred<{
      unit: 'CORRECT_WORDS_PER_MINUTE'
      changeRate: number | null
      points: readonly { date: string; speed: number }[]
    }>()
    const second = deferred<{
      unit: 'CORRECT_WORDS_PER_MINUTE'
      changeRate: number | null
      points: readonly { date: string; speed: number }[]
    }>()
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([])),
      getSummary: vi.fn().mockResolvedValue({
        totalStudents: 0,
        scheduledTodayCount: 0,
      }),
      getReadingSpeedTrend: vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    const oldRequest = store.loadReadingSpeedTrend(1)
    const newRequest = store.loadReadingSpeedTrend(1)
    second.resolve({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 12,
      points: [{ date: '2026-07-27', speed: 96 }],
    })
    await newRequest
    first.resolve({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: -5,
      points: [{ date: '2026-07-20', speed: 70 }],
    })
    await oldRequest

    expect(store.readingSpeedTrendById[1]).toEqual({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 12,
      points: [{ date: '2026-07-27', speed: 96 }],
    })
  })

  it('주기 재조회 중에는 기존 정확도와 읽기 속도를 loading 상태로 바꾸지 않는다', async () => {
    const nextAccuracy = deferred<{
      dailyAccuracy: readonly { date: string; accuracy: number }[]
    }>()
    const nextSpeed = deferred<{
      unit: 'CORRECT_WORDS_PER_MINUTE'
      changeRate: number | null
      points: readonly { date: string; speed: number }[]
    }>()
    const repository: StudentRepository = {
      ...mutationRepositoryMethods,
      list: vi.fn().mockResolvedValue(result([])),
      getSummary: vi.fn().mockResolvedValue({
        totalStudents: 0,
        scheduledTodayCount: 0,
      }),
      getAccuracyTrend: vi
        .fn()
        .mockResolvedValueOnce({ dailyAccuracy: [{ date: '2026-07-20', accuracy: 70 }] })
        .mockReturnValueOnce(nextAccuracy.promise),
      getReadingSpeedTrend: vi
        .fn()
        .mockResolvedValueOnce({
          unit: 'CORRECT_WORDS_PER_MINUTE',
          changeRate: null,
          points: [{ date: '2026-07-20', speed: 80 }],
        })
        .mockReturnValueOnce(nextSpeed.promise),
    }
    const store = useStudentStore()
    store.setRepository(repository)

    await Promise.all([store.loadAccuracyTrend(1), store.loadReadingSpeedTrend(1)])
    const accuracyRefresh = store.loadAccuracyTrend(1)
    const speedRefresh = store.loadReadingSpeedTrend(1)

    expect(store.accuracyTrendStatusById[1]).toBe('success')
    expect(store.readingSpeedTrendStatusById[1]).toBe('success')
    expect(store.accuracyTrendById[1]?.dailyAccuracy[0]?.accuracy).toBe(70)
    expect(store.readingSpeedTrendById[1]?.points[0]?.speed).toBe(80)

    nextAccuracy.resolve({ dailyAccuracy: [{ date: '2026-07-27', accuracy: 78 }] })
    nextSpeed.resolve({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 10,
      points: [{ date: '2026-07-27', speed: 88 }],
    })
    await Promise.all([accuracyRefresh, speedRefresh])

    expect(store.accuracyTrendById[1]?.dailyAccuracy[0]?.accuracy).toBe(78)
    expect(store.readingSpeedTrendById[1]?.points[0]?.speed).toBe(88)
  })
})

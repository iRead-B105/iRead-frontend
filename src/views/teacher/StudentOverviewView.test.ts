import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import StudentOverviewView from './StudentOverviewView.vue'
import type {
  StudentDetail,
  StudentLearningEvent,
  StudentLearningEventDetail,
  StudentLearningSummary,
  StudentRepository,
} from '@/features/teacher/student'
import { ApiError } from '@/lib/api'
import { useStudentStore } from '@/stores/students'

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function detail(studentId: number, name = '김하늘'): StudentDetail {
  return {
    studentId,
    name,
    birthday: '2018-03-15',
    gender: 'Boy',
    school: '새봄초등학교',
    guardian: '김보호',
    guardianContact: '010-0000-0001',
    guardianEmail: null,
    address: null,
    createdAt: '2026-03-01T09:00:00+09:00',
    imageUrl: null,
    teacherMemo: '기존 메모',
  }
}

function learningSummary(
  studentId: number,
  overrides: Partial<StudentLearningSummary> = {},
): StudentLearningSummary {
  return {
    studentId,
    currentStage: '문장 이해력 향상',
    lastLearningAt: '2026-07-27T16:00:00+09:00',
    attentionRequiredCount: 1,
    attentionReasons: ['LOW_ACCURACY'],
    ...overrides,
  }
}

function repository(overrides: Partial<StudentRepository> = {}): StudentRepository {
  return {
    list: vi.fn().mockResolvedValue({
      students: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
    }),
    getSummary: vi.fn().mockResolvedValue({
      totalStudents: 0,
      scheduledTodayCount: 0,
    }),
    getDetail: vi.fn().mockImplementation((studentId) => Promise.resolve(detail(studentId))),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getLearningSummary: vi
      .fn()
      .mockImplementation((studentId) => Promise.resolve(learningSummary(studentId))),
    listLearningEvents: vi.fn().mockResolvedValue([]),
    getLearningEvent: vi.fn(),
    getAccuracyTrend: vi.fn().mockResolvedValue({ dailyAccuracy: [] }),
    getReadingSpeedTrend: vi.fn().mockResolvedValue({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: null,
      points: [],
    }),
    getTrainingHistory: vi.fn().mockResolvedValue({ learningHistory: [] }),
    updateTeacherMemo: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

async function mountOverview(
  studentRepository: StudentRepository,
  initialPath = '/teacher/students/1',
) {
  const pinia = createPinia()
  const studentStore = useStudentStore(pinia)
  studentStore.setRepository(studentRepository)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>아동 목록</div>' },
      },
      {
        path: '/teacher/students/:id',
        name: 'student-overview',
        component: StudentOverviewView,
      },
      {
        path: '/teacher/students/:id/edit',
        name: 'student-edit',
        component: { template: '<div>아동 수정</div>' },
      },
      {
        path: '/teacher/students/:id/training-history',
        name: 'student-training-history',
        component: { template: '<div>훈련 이력</div>' },
      },
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  const wrapper = mount(StudentOverviewView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        ChartPanel: {
          template: '<div data-test="accuracy-chart">정확도 차트</div>',
        },
      },
    },
  })
  await flushPromises()
  return { wrapper, router, studentStore }
}

describe('StudentOverviewView', () => {
  it('Backend 공식 학습 summary를 유지하고 프로필 정보는 중복 표시하지 않는다', async () => {
    const { wrapper } = await mountOverview(repository())

    expect(wrapper.text()).toContain('학습 현황')
    expect(wrapper.text()).toContain('문장 이해력 향상')
    expect(wrapper.text()).toContain('정확도 저하')
    expect(wrapper.text()).toContain('교수자 확인 신호')
    expect(wrapper.find('.attention-state').exists()).toBe(false)
    expect(wrapper.get('.summary-card--attention').find('.summary-card__reasons').exists()).toBe(
      true,
    )
    expect(wrapper.find('.student-profile-card').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('김하늘')
    expect(wrapper.text()).not.toContain('확인 완료')
    expect(wrapper.text()).not.toContain('다음 권장 훈련')
    expect(wrapper.text()).not.toContain('목표 80%')
  })

  it('nullable 학생 상세도 프로필 facts 없이 학습 상태만 표시한다', async () => {
    const nullableDetail: StudentDetail = {
      ...detail(1),
      birthday: null,
      gender: null,
      school: null,
      guardian: null,
      guardianContact: null,
    }
    const { wrapper } = await mountOverview(
      repository({
        getDetail: vi.fn().mockResolvedValue(nullableDetail),
      }),
    )

    expect(wrapper.find('.student-profile-card').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('여자')
    expect(wrapper.text()).toContain('학습 상태 요약')
  })

  it('NO_HISTORY를 주의 건수와 분리해 표시한다', async () => {
    const studentRepository = repository({
      getLearningSummary: vi.fn().mockResolvedValue(
        learningSummary(3, {
          currentStage: null,
          lastLearningAt: null,
          attentionRequiredCount: 0,
          attentionReasons: ['NO_HISTORY'],
        }),
      ),
    })
    const { wrapper } = await mountOverview(studentRepository, '/teacher/students/3')

    expect(wrapper.text()).toContain('교수자 확인 신호')
    expect(wrapper.text()).toContain('0건')
    expect(wrapper.find('.summary-card__reasons').exists()).toBe(false)
    expect(wrapper.find('.attention-state').exists()).toBe(false)
    expect(wrapper.text()).toContain('표시할 읽기 정확도 데이터가 없습니다.')
    expect(wrapper.text()).toContain('아직 표시할 학습 이벤트가 없습니다.')
    expect(wrapper.text()).toContain('전체 훈련 이력 보기')
    expect(wrapper.text()).not.toContain('최근 읽기 정확도 확인 필요')

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0]!.attributes('aria-selected')).toBe('true')
    expect(tabs[1]!.attributes('aria-selected')).toBe('false')

    await tabs[1]!.trigger('click')

    expect(tabs[0]!.attributes('aria-selected')).toBe('false')
    expect(tabs[1]!.attributes('aria-selected')).toBe('true')
    expect(wrapper.text()).toContain('표시할 읽기 속도 데이터가 없습니다.')
  })

  it('정확도 데이터가 1건이면 변화폭을 계산하지 않는다', async () => {
    const { wrapper } = await mountOverview(
      repository({
        getAccuracyTrend: vi.fn().mockResolvedValue({
          dailyAccuracy: [{ date: '2026-07-27', accuracy: 82 }],
        }),
      }),
    )

    expect(wrapper.text()).toContain('82% → 82%')
    expect(wrapper.text()).toContain('1개 날짜 기록')
    expect(wrapper.text()).not.toContain('%p')
  })

  it('route의 studentId가 바뀌면 새 상세를 조회하고 이전 아동을 표시하지 않는다', async () => {
    const getDetail = vi
      .fn()
      .mockImplementation((studentId: number) =>
        Promise.resolve(detail(studentId, studentId === 1 ? '첫째 아동' : '둘째 아동')),
      )
    const studentRepository = repository({
      getDetail,
      getLearningSummary: vi
        .fn()
        .mockImplementation((studentId: number) => Promise.resolve(learningSummary(studentId))),
    })
    const { wrapper, router, studentStore } = await mountOverview(studentRepository)

    await router.push('/teacher/students/2')
    await flushPromises()

    expect(getDetail).toHaveBeenCalledWith(2)
    expect(studentStore.detailsById[2]?.name).toBe('둘째 아동')
    expect(wrapper.text()).toContain('학습 현황')
    expect(wrapper.text()).not.toContain('첫째 아동')
  })

  it('403 접근 오류를 mock 학습자로 대체하지 않는다', async () => {
    const studentRepository = repository({
      getDetail: vi.fn().mockRejectedValue(
        new ApiError({
          status: 403,
          code: 'FORBIDDEN',
          message: '접근 권한이 없습니다.',
        }),
      ),
    })
    const { wrapper } = await mountOverview(studentRepository)

    expect(wrapper.text()).toContain('이 아동을 조회할 권한이 없습니다.')
    expect(wrapper.text()).toContain('아동 목록으로 이동')
    expect(wrapper.text()).not.toContain('김하늘')
  })

  it('404에서는 목록 이동 action을 제공하고 고정 상세를 표시하지 않는다', async () => {
    const studentRepository = repository({
      getDetail: vi.fn().mockRejectedValue(
        new ApiError({
          status: 404,
          code: 'STUDENT_NOT_FOUND',
          message: '아동을 찾을 수 없습니다.',
        }),
      ),
    })
    const { wrapper } = await mountOverview(studentRepository)

    expect(wrapper.text()).toContain('아동을 찾을 수 없습니다.')
    expect(wrapper.text()).toContain('아동 목록으로 이동')
    expect(wrapper.text()).not.toContain('김하늘')
  })

  it('메모를 trim해 저장하고 빈 값으로 기존 메모를 삭제한다', async () => {
    const updateTeacherMemo = vi.fn().mockResolvedValue(undefined)
    const { wrapper } = await mountOverview(repository({ updateTeacherMemo }))
    const textarea = wrapper.get<HTMLTextAreaElement>('#internal-note')

    await textarea.setValue('  새 메모  ')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '메모 저장')
      ?.trigger('click')
    await flushPromises()

    expect(updateTeacherMemo).toHaveBeenNthCalledWith(1, 1, '새 메모')
    expect(textarea.element.value).toBe('새 메모')

    await textarea.setValue('   ')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '메모 삭제')
      ?.trigger('click')
    await flushPromises()

    expect(updateTeacherMemo).toHaveBeenNthCalledWith(2, 1, null)
    expect(textarea.element.value).toBe('')
  })

  it('메모 저장 실패 시 입력을 유지하고 중복 요청을 막는다', async () => {
    let rejectSave!: (error: Error) => void
    const savePromise = new Promise<void>((_resolve, reject) => {
      rejectSave = reject
    })
    const updateTeacherMemo = vi.fn().mockReturnValue(savePromise)
    const { wrapper } = await mountOverview(repository({ updateTeacherMemo }))
    const textarea = wrapper.get<HTMLTextAreaElement>('#internal-note')
    await textarea.setValue('저장 실패 메모')
    const saveButton = wrapper.findAll('button').find((button) => button.text() === '메모 저장')!

    await saveButton.trigger('click')
    await saveButton.trigger('click')

    expect(updateTeacherMemo).toHaveBeenCalledTimes(1)
    expect(saveButton.attributes('disabled')).toBeDefined()
    rejectSave(new Error('저장 실패'))
    await flushPromises()

    expect(textarea.element.value).toBe('저장 실패 메모')
    expect(wrapper.text()).toContain('저장 실패')
  })

  it('실제 eventId 상세과 Backend 추천을 표시하고 이벤트 요약을 저장 없이 메모에 추가한다', async () => {
    const event: StudentLearningEvent = {
      eventId: 701,
      eventType: 'TRAINING',
      occurredAt: '2026-07-27T16:00:00+09:00',
      sourceId: 91,
      accuracy: 68,
      attentionRequired: true,
      attentionReasons: ['LOW_ACCURACY'],
    }
    const eventDetail: StudentLearningEventDetail = {
      ...event,
      retryCount: 2,
      problemSegments: ['받침 ㄹ 발음'],
      recommendedTrainingTemplateId: 301,
      recommendedCurriculumUnitId: 31,
      recommendedCurriculumUnitName: '받침이 있는 문장 읽기',
      recommendationReason: '최근 6주 정확도가 가장 낮은 영역입니다.',
      recommendedMinutes: 10,
      recommendedRepeatCount: 2,
    }
    const getLearningEvent = vi.fn().mockResolvedValue(eventDetail)
    const updateTeacherMemo = vi.fn().mockResolvedValue(undefined)
    const studentRepository = repository({
      listLearningEvents: vi.fn().mockResolvedValue([event]),
      getLearningEvent,
      getAccuracyTrend: vi.fn().mockResolvedValue({
        dailyAccuracy: [
          { date: '2026-06-20', accuracy: 60 },
          { date: '2026-07-27', accuracy: 72 },
        ],
      }),
      getReadingSpeedTrend: vi.fn().mockResolvedValue({
        unit: 'CORRECT_WORDS_PER_MINUTE',
        changeRate: 12.5,
        points: [
          { date: '2026-07-20', speed: 84 },
          { date: '2026-07-27', speed: 96 },
        ],
      }),
      updateTeacherMemo,
    })
    const { wrapper } = await mountOverview(studentRepository)

    expect(wrapper.text()).toContain('첫 기록 대비 +12%p')
    expect(wrapper.find('[data-test="accuracy-chart"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('기간 변화 +12.5%')
    expect(wrapper.text()).toContain('84 → 96 단어/분')
    expect(wrapper.text()).toContain('전체 훈련 이력 보기')

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('읽기 훈련'))!
      .trigger('click')
    await flushPromises()

    expect(getLearningEvent).toHaveBeenCalledWith(1, 'TRAINING', 701)
    expect(wrapper.text()).toContain('받침이 있는 문장 읽기')
    expect(wrapper.text()).toContain('최근 6주 정확도가 가장 낮은 영역입니다.')
    expect(wrapper.get('.event-detail').element.closest('li')).not.toBeNull()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '내부 메모에 추가')!
      .trigger('click')

    expect(wrapper.get<HTMLTextAreaElement>('#internal-note').element.value).toContain(
      '받침 ㄹ 발음',
    )
    expect(updateTeacherMemo).not.toHaveBeenCalled()

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('읽기 훈련'))!
      .trigger('click')

    expect(wrapper.find('.event-detail').exists()).toBe(false)
  })

  it('학습 분석 API 오류를 고정 mock 이벤트로 대체하지 않는다', async () => {
    const { wrapper } = await mountOverview(
      repository({
        listLearningEvents: vi.fn().mockRejectedValue(new Error('이벤트 연결 실패')),
        getAccuracyTrend: vi.fn().mockRejectedValue(new Error('정확도 연결 실패')),
        getReadingSpeedTrend: vi.fn().mockRejectedValue(new Error('읽기 속도 연결 실패')),
      }),
    )

    expect(wrapper.text()).toContain('최근 학습 이벤트를 불러오지 못했습니다.')
    expect(wrapper.text()).toContain('정확도 추이를 불러오지 못했습니다.')
    expect(wrapper.text()).not.toContain('받침이 있는 문장 읽기')

    await wrapper
      .findAll('button')
      .find((button) => button.text().trim() === '읽기 속도')!
      .trigger('click')

    expect(wrapper.text()).toContain('읽기 속도 추이를 불러오지 못했습니다.')
  })

  it('기록을 빠르게 바꿔도 이전 상세 응답이 현재 선택을 덮어쓰지 않는다', async () => {
    const firstEvent: StudentLearningEvent = {
      eventId: 701,
      eventType: 'TRAINING',
      occurredAt: '2026-07-27T16:00:00+09:00',
      sourceId: 91,
      accuracy: 68,
      attentionRequired: true,
      attentionReasons: ['LOW_ACCURACY'],
    }
    const secondEvent: StudentLearningEvent = {
      eventId: 702,
      eventType: 'GAZE',
      occurredAt: '2026-07-28T16:00:00+09:00',
      sourceId: 92,
      accuracy: null,
      attentionRequired: true,
      attentionReasons: ['GAZE_ANALYSIS_FAILED'],
    }
    const firstRequest = deferred<StudentLearningEventDetail>()
    const secondRequest = deferred<StudentLearningEventDetail>()
    const getLearningEvent = vi
      .fn()
      .mockImplementation((_studentId: number, _eventType: string, eventId: number) =>
        eventId === firstEvent.eventId ? firstRequest.promise : secondRequest.promise,
      )
    const { wrapper } = await mountOverview(
      repository({
        listLearningEvents: vi.fn().mockResolvedValue([firstEvent, secondEvent]),
        getLearningEvent,
      }),
    )
    const eventButtons = wrapper.findAll('.learning-event')

    await eventButtons[0]!.trigger('click')
    await eventButtons[1]!.trigger('click')

    expect(wrapper.findAll('.event-detail-shell')).toHaveLength(1)
    expect(eventButtons[1]!.classes()).toContain('is-selected')
    expect(wrapper.text()).toContain('학습 이벤트 상세를 불러오는 중입니다.')

    firstRequest.resolve({
      ...firstEvent,
      retryCount: 1,
      problemSegments: ['이전 상세 문제'],
      recommendedTrainingTemplateId: null,
      recommendedCurriculumUnitId: null,
      recommendedCurriculumUnitName: null,
      recommendationReason: null,
      recommendedMinutes: null,
      recommendedRepeatCount: null,
    })
    await flushPromises()

    expect(wrapper.text()).not.toContain('이전 상세 문제')
    expect(wrapper.text()).toContain('학습 이벤트 상세를 불러오는 중입니다.')

    secondRequest.resolve({
      ...secondEvent,
      retryCount: 0,
      problemSegments: ['현재 상세 문제'],
      recommendedTrainingTemplateId: null,
      recommendedCurriculumUnitId: null,
      recommendedCurriculumUnitName: null,
      recommendationReason: null,
      recommendedMinutes: null,
      recommendedRepeatCount: null,
    })
    await flushPromises()

    expect(wrapper.text()).toContain('현재 상세 문제')
    expect(wrapper.text()).not.toContain('이전 상세 문제')
  })
})

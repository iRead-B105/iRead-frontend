import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRealtimeFreshnessStore } from '@/stores/realtimeFreshness'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'
import { useTrainingStore } from '@/stores/training'
import { installTeacherRealtimeSync } from './installTeacherRealtimeSync'

interface CapturedRealtimeOptions {
  readonly onEvent: (event: {
    eventId: string
    studentId: number
    resource: 'STUDENT' | 'CURRICULUM' | 'TRAINING'
    resourceId: number | null
    changeType: string
    occurredAt: string
    version: number
  }) => void | Promise<void>
  readonly onStateChange?: (
    state: 'disconnected' | 'connecting' | 'connected' | 'reconnecting',
  ) => void
}

const realtimeHarness = vi.hoisted(() => ({
  options: null as unknown,
}))

vi.mock('@/lib/realtime/realtimeClient', () => ({
  RealtimeClient: class {
    constructor(options: unknown) {
      realtimeHarness.options = options
    }

    start() {}

    stop() {}
  },
}))

async function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id',
        name: 'student-overview',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/report',
        name: 'student-report',
        component: { template: '<div />' },
      },
      {
        path: '/teacher/students/:id/curriculum',
        name: 'student-curriculum',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/teacher/students')
  await router.isReady()

  const session = useSessionStore(pinia)
  session.initialize(
    {
      email: 'teacher@example.com',
      name: '교수자',
      organization: null,
      gender: null,
      profileImageUrl: null,
    },
    'access-token',
  )
  const students = useStudentStore(pinia)
  const freshness = useRealtimeFreshnessStore(pinia)
  return { pinia, router, session, students, freshness }
}

describe('installTeacherRealtimeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T10:00:00+09:00'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    realtimeHarness.options = null
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('Store 오류가 3초 지속될 때 경고하고 현재 화면 재조회 성공 후 제거한다', async () => {
    const { pinia, router, students, freshness } = await setup()
    let shouldSucceed = false
    const refreshList = vi.spyOn(students, 'refreshList').mockImplementation(async () => {
      students.listStatus = shouldSucceed ? 'success' : 'error'
      return shouldSucceed
    })
    const refreshSummary = vi.spyOn(students, 'refreshSummary').mockImplementation(async () => {
      students.summaryStatus = shouldSucceed ? 'success' : 'error'
      return shouldSucceed
    })
    const stop = installTeacherRealtimeSync(pinia, router)
    const options = realtimeHarness.options as CapturedRealtimeOptions

    options.onStateChange?.('connected')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2_999)
    expect(freshness.warningVisible).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    expect(freshness.warningVisible).toBe(true)

    shouldSucceed = true
    freshness.requestRetry()
    await flushPromises()

    expect(refreshList).toHaveBeenCalled()
    expect(refreshSummary).toHaveBeenCalled()
    expect(freshness.warningVisible).toBe(false)
    expect(freshness.retrying).toBe(false)
    stop()
  })

  it('보고서 라우트로 이동하면 이전 최신성 상태를 제거하고 이벤트로 다시 만들지 않는다', async () => {
    const { pinia, router, students, freshness } = await setup()
    vi.spyOn(students, 'refreshList').mockImplementation(async () => {
      students.listStatus = 'error'
      return false
    })
    vi.spyOn(students, 'refreshSummary').mockImplementation(async () => {
      students.summaryStatus = 'error'
      return false
    })
    const stop = installTeacherRealtimeSync(pinia, router)
    const options = realtimeHarness.options as CapturedRealtimeOptions

    options.onStateChange?.('connected')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(3_000)
    expect(freshness.warningVisible).toBe(true)

    await router.push('/teacher/students/2001/report')
    await flushPromises()
    expect(freshness.activeContextKey).toBeNull()
    expect(freshness.warningVisible).toBe(false)

    await options.onEvent({
      eventId: 'event-1',
      studentId: 2001,
      resource: 'STUDENT',
      resourceId: 2001,
      changeType: 'UPDATED',
      occurredAt: '2026-07-31T10:00:00+09:00',
      version: 1,
    })
    await vi.advanceTimersByTimeAsync(3_000)
    expect(freshness.warningVisible).toBe(false)
    stop()
  })

  it('커리큘럼 화면의 일반 학습 이벤트는 기존 행을 유지하는 갱신 경로를 사용한다', async () => {
    const { pinia, router, students } = await setup()
    await router.push('/teacher/students/2001/curriculum')
    const training = useTrainingStore(pinia)
    const loadForStudent = vi.spyOn(training, 'loadForStudent').mockResolvedValue()
    const refreshForStudent = vi.spyOn(training, 'refreshForStudent').mockResolvedValue(true)
    vi.spyOn(students, 'refreshList').mockImplementation(async () => {
      students.listStatus = 'success'
      return true
    })
    vi.spyOn(students, 'refreshSummary').mockImplementation(async () => {
      students.summaryStatus = 'success'
      return true
    })
    const stop = installTeacherRealtimeSync(pinia, router)
    const options = realtimeHarness.options as CapturedRealtimeOptions

    await options.onEvent({
      eventId: 'event-training-reset',
      studentId: 2001,
      resource: 'TRAINING',
      resourceId: 101,
      changeType: 'RESET',
      occurredAt: '2026-07-31T10:00:00+09:00',
      version: 1,
    })

    expect(refreshForStudent).toHaveBeenCalledWith(2001)
    expect(loadForStudent).not.toHaveBeenCalled()
    stop()
  })
  it('교안 CONTENT_UPDATED는 커리큘럼 전체 재조회 대신 편집 충돌 보호 경로로 처리한다', async () => {
    const { pinia, router, students } = await setup()
    await router.push('/teacher/students/2001/curriculum')
    const training = useTrainingStore(pinia)
    const loadForStudent = vi.spyOn(training, 'loadForStudent').mockResolvedValue()
    const handleLessonMaterialContentUpdated = vi
      .spyOn(training, 'handleLessonMaterialContentUpdated')
      .mockResolvedValue(true)
    vi.spyOn(students, 'refreshList').mockImplementation(async () => {
      students.listStatus = 'success'
      return true
    })
    vi.spyOn(students, 'refreshSummary').mockImplementation(async () => {
      students.summaryStatus = 'success'
      return true
    })
    const stop = installTeacherRealtimeSync(pinia, router)
    const options = realtimeHarness.options as CapturedRealtimeOptions

    await options.onEvent({
      eventId: 'event-content-updated',
      studentId: 2001,
      resource: 'TRAINING',
      resourceId: 101,
      changeType: 'CONTENT_UPDATED',
      occurredAt: '2026-07-31T10:00:00+09:00',
      version: 1,
    })

    expect(handleLessonMaterialContentUpdated).toHaveBeenCalledWith(2001, 101)
    expect(loadForStudent).not.toHaveBeenCalled()
    stop()
  })

  it('refreshes overview trends when the learner advances a demo day', async () => {
    const { pinia, router, students } = await setup()
    await router.push('/teacher/students/2001')
    vi.spyOn(students, 'refreshList').mockResolvedValue(true)
    vi.spyOn(students, 'refreshSummary').mockResolvedValue(true)
    vi.spyOn(students, 'loadDetail').mockImplementation(async () => {
      students.detailStatusById[2001] = 'success'
      return null
    })
    vi.spyOn(students, 'loadLearningSummary').mockImplementation(async () => {
      students.learningSummaryStatusById[2001] = 'success'
      return null
    })
    vi.spyOn(students, 'loadLearningEvents').mockImplementation(async () => {
      students.learningEventsStatusById[2001] = 'success'
      return []
    })
    const loadAccuracyTrend = vi.spyOn(students, 'loadAccuracyTrend').mockImplementation(async () => {
      students.accuracyTrendStatusById[2001] = 'success'
      return null
    })
    const loadAccuracyRecords = vi
      .spyOn(students, 'loadAccuracyRecords')
      .mockImplementation(async () => {
        students.accuracyRecordsStatusById[2001] = 'success'
        return null
      })
    const loadReadingSpeedTrend = vi
      .spyOn(students, 'loadReadingSpeedTrend')
      .mockImplementation(async () => {
        students.readingSpeedTrendStatusById[2001] = 'success'
        return null
      })
    const loadReadingSpeedRecords = vi
      .spyOn(students, 'loadReadingSpeedRecords')
      .mockImplementation(async () => {
        students.readingSpeedRecordsStatusById[2001] = 'success'
        return null
      })
    const stop = installTeacherRealtimeSync(pinia, router)
    const options = realtimeHarness.options as CapturedRealtimeOptions

    await options.onEvent({
      eventId: 'event-next-day',
      studentId: 2001,
      resource: 'CURRICULUM',
      resourceId: 180004,
      changeType: 'ADVANCED_TO_NEXT_DAY',
      occurredAt: '2026-08-04T10:30:00+09:00',
      version: 1,
    })

    expect(loadAccuracyTrend).toHaveBeenCalledWith(2001)
    expect(loadAccuracyRecords).toHaveBeenCalledWith(2001)
    expect(loadReadingSpeedTrend).toHaveBeenCalledWith(2001)
    expect(loadReadingSpeedRecords).toHaveBeenCalledWith(2001)
    stop()
  })

  it('기존 그래프를 유지한 재조회 실패도 최신성 실패로 표시한다', async () => {
    const { pinia, router, students, freshness } = await setup()
    await router.push('/teacher/students/2001')
    vi.spyOn(students, 'refreshList').mockResolvedValue(true)
    vi.spyOn(students, 'refreshSummary').mockResolvedValue(true)
    vi.spyOn(students, 'loadDetail').mockImplementation(async () => {
      students.detailStatusById[2001] = 'success'
      return null
    })
    vi.spyOn(students, 'loadLearningSummary').mockImplementation(async () => {
      students.learningSummaryStatusById[2001] = 'success'
      return null
    })
    vi.spyOn(students, 'loadLearningEvents').mockImplementation(async () => {
      students.learningEventsStatusById[2001] = 'success'
      return []
    })
    vi.spyOn(students, 'loadAccuracyTrend').mockImplementation(async () => {
      students.accuracyTrendStatusById[2001] = 'success'
      students.accuracyTrendErrorById[2001] = '정확도 재조회 실패'
      return null
    })
    vi.spyOn(students, 'loadReadingSpeedTrend').mockImplementation(async () => {
      students.readingSpeedTrendStatusById[2001] = 'success'
      students.readingSpeedTrendErrorById[2001] = null
      return null
    })
    const stop = installTeacherRealtimeSync(pinia, router)
    const options = realtimeHarness.options as CapturedRealtimeOptions

    await options.onEvent({
      eventId: 'event-refresh-failed',
      studentId: 2001,
      resource: 'TRAINING',
      resourceId: 101,
      changeType: 'UPDATED',
      occurredAt: '2026-08-04T10:30:00+09:00',
      version: 1,
    })
    expect(freshness.warningVisible).toBe(false)

    await vi.advanceTimersByTimeAsync(3_000)
    expect(freshness.warningVisible).toBe(true)
    stop()
  })
})

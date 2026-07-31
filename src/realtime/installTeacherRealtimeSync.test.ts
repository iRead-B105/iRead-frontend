import { createPinia, setActivePinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRealtimeFreshnessStore } from '@/stores/realtimeFreshness'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'
import { installTeacherRealtimeSync } from './installTeacherRealtimeSync'

interface CapturedRealtimeOptions {
  readonly onEvent: (event: {
    eventId: string
    studentId: number
    resource: 'STUDENT'
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

vi.mock('@/config/runtimeEnv', () => ({
  appEnvironment: {
    dataSource: 'api',
  },
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
    const loadList = vi.spyOn(students, 'loadList').mockImplementation(async () => {
      students.listStatus = shouldSucceed ? 'success' : 'error'
    })
    const loadSummary = vi.spyOn(students, 'loadSummary').mockImplementation(async () => {
      students.summaryStatus = shouldSucceed ? 'success' : 'error'
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

    expect(loadList).toHaveBeenCalled()
    expect(loadSummary).toHaveBeenCalled()
    expect(freshness.warningVisible).toBe(false)
    expect(freshness.retrying).toBe(false)
    stop()
  })

  it('보고서 라우트로 이동하면 이전 최신성 상태를 제거하고 이벤트로 다시 만들지 않는다', async () => {
    const { pinia, router, students, freshness } = await setup()
    vi.spyOn(students, 'loadList').mockImplementation(async () => {
      students.listStatus = 'error'
    })
    vi.spyOn(students, 'loadSummary').mockImplementation(async () => {
      students.summaryStatus = 'error'
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
})

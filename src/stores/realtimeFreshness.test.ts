import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { REALTIME_FRESHNESS_WARNING_DELAY_MS, useRealtimeFreshnessStore } from './realtimeFreshness'

describe('realtime freshness store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T10:00:00+09:00'))
    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('3초 안에 재조회가 성공하면 경고를 표시하지 않는다', () => {
    const store = useRealtimeFreshnessStore()
    store.setContext('student-overview:2001', ['global', 'visible'])
    const generation = store.beginRefresh('visible', 'student-overview:2001')

    vi.advanceTimersByTime(REALTIME_FRESHNESS_WARNING_DELAY_MS - 1)
    store.markRefreshSuccess('visible', 'student-overview:2001', generation)
    vi.runAllTimers()

    expect(store.warningVisible).toBe(false)
    expect(store.lastSuccessfulAt).toBe(Date.now())
  })

  it('재조회가 3초 이상 성공하지 못하면 경고를 표시한다', () => {
    const store = useRealtimeFreshnessStore()
    store.setContext('student-overview:2001', ['visible'])
    const generation = store.beginRefresh('visible', 'student-overview:2001')
    store.markRefreshFailure('visible', 'student-overview:2001', generation)

    vi.advanceTimersByTime(REALTIME_FRESHNESS_WARNING_DELAY_MS)

    expect(store.warningVisible).toBe(true)
  })

  it('한 범위의 성공이 다른 범위의 실패 경고를 제거하지 않는다', () => {
    const store = useRealtimeFreshnessStore()
    store.setContext('student-overview:2001', ['global', 'visible'])
    const globalGeneration = store.beginRefresh('global', 'student-overview:2001')
    const visibleGeneration = store.beginRefresh('visible', 'student-overview:2001')

    store.markRefreshSuccess('global', 'student-overview:2001', globalGeneration)
    store.markRefreshFailure('visible', 'student-overview:2001', visibleGeneration)
    vi.advanceTimersByTime(REALTIME_FRESHNESS_WARNING_DELAY_MS)

    expect(store.scopes.global.stale).toBe(false)
    expect(store.scopes.visible.stale).toBe(true)
    expect(store.warningVisible).toBe(true)
  })

  it('학생이나 라우트가 바뀌면 이전 경고와 성공 시각을 초기화한다', () => {
    const store = useRealtimeFreshnessStore()
    store.setContext('student-overview:2001', ['visible'])
    const generation = store.beginRefresh('visible', 'student-overview:2001')
    store.markRefreshSuccess('visible', 'student-overview:2001', generation)

    store.setContext('student-overview:2002', ['visible'])

    expect(store.warningVisible).toBe(false)
    expect(store.lastSuccessfulAt).toBeNull()
    expect(store.scopes.visible.pending).toBe(false)
  })

  it('수동 재시도 요청을 중복으로 만들지 않는다', () => {
    const store = useRealtimeFreshnessStore()
    store.setContext('teacher-students', ['global'])

    store.requestRetry()
    store.requestRetry()

    expect(store.retryRequestVersion).toBe(1)
    expect(store.retrying).toBe(true)
    store.finishRetry(1)
    expect(store.retrying).toBe(false)
  })
})

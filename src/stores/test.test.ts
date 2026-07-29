import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MockTestRepository,
  type TestComparison,
  type TestListItem,
  type TestRepository,
} from '@/features/teacher/test'
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import { ApiError } from '@/lib/api'
import { useTestStore } from './test'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

function repository(overrides: Partial<TestRepository> = {}): TestRepository {
  return {
    getTests: vi.fn().mockResolvedValue([]),
    compareTests: vi.fn(),
    getGazeAnalysis: vi.fn().mockResolvedValue({ status: 'NO_DATA', analysis: null }),
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Test store', () => {
  it('검사 목록 재조회 실패 시 이전 결과를 유지한다', async () => {
    const mock = new MockTestRepository()
    const getTests = vi
      .fn()
      .mockResolvedValueOnce(await mock.getTests(1))
      .mockRejectedValueOnce(
        new ApiError({
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'internal details',
        }),
      )
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        compareTests: vi
          .fn()
          .mockImplementation((studentId, currentTestId, ids) =>
            mock.compareTests(studentId, currentTestId, ids),
          ),
      }),
    )
    await store.loadForStudent(1)
    const previousIds = store.tests.map((test) => test.testId)
    const previousComparison = store.comparisonResult

    await store.retryList()

    expect(store.listStatus).toBe('error')
    expect(store.tests.map((test) => test.testId)).toEqual(previousIds)
    expect(store.comparisonResult).toBe(previousComparison)
    expect(store.listError).not.toContain('internal')
  })

  it('검사 목록 재조회가 빈 결과이면 이전 선택과 상세를 정리한다', async () => {
    const mock = new MockTestRepository()
    const getTests = vi
      .fn()
      .mockResolvedValueOnce(await mock.getTests(1))
      .mockResolvedValueOnce([])
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        compareTests: vi
          .fn()
          .mockImplementation((studentId, currentTestId, ids) =>
            mock.compareTests(studentId, currentTestId, ids),
          ),
      }),
    )
    await store.loadForStudent(1)

    await store.retryList()

    expect(store.listStatus).toBe('success')
    expect(store.tests).toEqual([])
    expect(store.currentTestId).toBeNull()
    expect(store.comparisonTestIds).toEqual([])
    expect(store.comparisonResult).toBeNull()
    expect(store.gazeAnalysis).toBeNull()
  })

  it('최신 완료 검사를 기본 선택하고 비교 0건으로 단일 상세를 요청한다', async () => {
    const mock = new MockTestRepository()
    const compareTests = vi.spyOn(mock, 'compareTests')
    const store = useTestStore()
    store.setRepository(mock)

    await store.loadForStudent(1)

    expect(store.tests.map((test) => test.testId)).toEqual([1_011, 1_008, 1_005, 1_004])
    expect(store.currentTestId).toBe(1_011)
    expect(store.comparisonTestIds).toEqual([])
    expect(store.comparisonResult?.currentTest.testId).toBe(1_011)
    expect(compareTests).toHaveBeenCalledWith(
      1,
      1_011,
      [],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.gazeStatus).toBe('success')
    expect(store.gazeAnalysis).toMatchObject({ status: 'AVAILABLE' })
  })

  it('비교 검사를 최대 두 건만 추가하고 개별 해제한다', async () => {
    const store = useTestStore()
    store.setRepository(new MockTestRepository())
    await store.loadForStudent(1)

    await expect(store.addComparisonTest(1, 1_008)).resolves.toBe(true)
    await expect(store.addComparisonTest(1, 1_005)).resolves.toBe(true)
    await expect(store.addComparisonTest(1, 1_004)).resolves.toBe(false)
    expect(store.comparisonTestIds).toEqual([1_008, 1_005])
    expect(store.canAddComparison).toBe(false)

    await expect(store.removeComparisonTest(1, 1_008)).resolves.toBe(true)
    expect(store.comparisonTestIds).toEqual([1_005])
    expect(store.comparisonResult?.comparisonTests.map((test) => test.testId)).toEqual([1_005])
  })

  it('기준 검사 변경 시 중복되는 비교 검사를 제거한다', async () => {
    const store = useTestStore()
    store.setRepository(new MockTestRepository())
    await store.loadForStudent(1)
    await store.addComparisonTest(1, 1_008)

    await store.selectCurrentTest(1, 1_008)

    expect(store.currentTestId).toBe(1_008)
    expect(store.comparisonTestIds).toEqual([])
    expect(store.comparisonResult?.currentTest.testId).toBe(1_008)
  })

  it('빠른 선택 변경에서 늦게 끝난 이전 비교 응답을 무시한다', async () => {
    const oldResult = deferred<TestComparison>()
    const mock = new MockTestRepository()
    let delayNext1008 = false
    const compareTests = vi.fn().mockImplementation((studentId, currentTestId, ids) => {
      if (delayNext1008 && currentTestId === 1_008) {
        delayNext1008 = false
        return oldResult.promise
      }
      return mock.compareTests(studentId, currentTestId, ids)
    })
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        compareTests,
      }),
    )
    await store.loadForStudent(1)

    delayNext1008 = true
    const oldRequest = store.selectCurrentTest(1, 1_008)
    await store.selectCurrentTest(1, 1_005)
    oldResult.resolve(await mock.compareTests(1, 1_008, []))
    await oldRequest

    expect(store.currentTestId).toBe(1_005)
    expect(store.comparisonResult?.currentTest.testId).toBe(1_005)
  })

  it('전체 검사 상세를 최대 세 건씩 조회하고 일부 실패 시 성공 결과를 유지한다', async () => {
    const mock = new MockTestRepository()
    let activeRequests = 0
    let maximumActiveRequests = 0
    const compareTests = vi.fn().mockImplementation(async (studentId, currentTestId, ids) => {
      activeRequests += 1
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests)
      await Promise.resolve()
      activeRequests -= 1
      if (currentTestId === 1_005) throw new Error('temporary failure')
      return mock.compareTests(studentId, currentTestId, ids)
    })
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        compareTests,
      }),
    )

    await store.loadForStudent(1)

    expect(maximumActiveRequests).toBeLessThanOrEqual(3)
    expect(store.trendStatus).toBe('success')
    expect(store.trendFailedCount).toBe(1)
    expect(store.trendDetails.map((detail) => detail.testId)).toEqual([1_004, 1_008, 1_011])
    expect(store.trendError).toContain('일부 검사 1건')
  })

  it('빠른 기준 검사 변경에서 늦게 끝난 이전 시선 응답을 무시한다', async () => {
    const oldGaze = deferred<GazeAnalysisState>()
    const mock = new MockTestRepository()
    const getGazeAnalysis = vi
      .fn()
      .mockResolvedValueOnce(await mock.getGazeAnalysis(1, 1_011))
      .mockReturnValueOnce(oldGaze.promise)
      .mockResolvedValueOnce({ status: 'FAILED', analysis: null })
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        compareTests: vi
          .fn()
          .mockImplementation((studentId, currentTestId, ids) =>
            mock.compareTests(studentId, currentTestId, ids),
          ),
        getGazeAnalysis,
      }),
    )
    await store.loadForStudent(1)

    const oldRequest = store.selectCurrentTest(1, 1_008)
    await store.selectCurrentTest(1, 1_005)
    oldGaze.resolve({ status: 'NO_DATA', analysis: null })
    await oldRequest

    expect(store.currentTestId).toBe(1_005)
    expect(store.gazeAnalysis).toEqual({ status: 'FAILED', analysis: null })
  })

  it('시선 요청 오류를 검사 상세 성공과 도메인 상태에서 분리한다', async () => {
    const mock = new MockTestRepository()
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        compareTests: vi
          .fn()
          .mockImplementation((studentId, currentTestId, ids) =>
            mock.compareTests(studentId, currentTestId, ids),
          ),
        getGazeAnalysis: vi.fn().mockRejectedValue(new Error('internal details')),
      }),
    )

    await store.loadForStudent(1)

    expect(store.comparisonStatus).toBe('success')
    expect(store.gazeStatus).toBe('error')
    expect(store.gazeError).toBe('시선 분석 결과를 불러오지 못했습니다.')
    expect(store.gazeAnalysis).toBeNull()
  })

  it('학습자 route 변경에서 늦게 끝난 이전 목록 응답을 무시한다', async () => {
    const oldList = deferred<readonly TestListItem[]>()
    const mock = new MockTestRepository()
    const getTests = vi
      .fn()
      .mockReturnValueOnce(oldList.promise)
      .mockResolvedValueOnce(await mock.getTests(2))
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        compareTests: vi
          .fn()
          .mockImplementation((studentId, currentTestId, ids) =>
            mock.compareTests(studentId, currentTestId, ids),
          ),
      }),
    )

    const firstRequest = store.loadForStudent(1)
    await store.loadForStudent(2)
    oldList.resolve(await mock.getTests(1))
    await firstRequest

    expect(store.studentId).toBe(2)
    expect(store.tests.map((test) => test.testId)).toEqual([2_001])
    expect(store.currentTestId).toBe(2_001)
  })

  it('403 오류를 권한 안내로 변환하고 고정 결과를 표시하지 않는다', async () => {
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockRejectedValue(
          new ApiError({
            status: 403,
            code: 'FORBIDDEN',
            message: 'internal message',
          }),
        ),
      }),
    )

    await store.loadForStudent(1)

    expect(store.listStatus).toBe('error')
    expect(store.listError).toBe('이 학습자의 검사 기록을 볼 권한이 없습니다.')
    expect(store.tests).toEqual([])
    expect(store.comparisonResult).toBeNull()
  })
})

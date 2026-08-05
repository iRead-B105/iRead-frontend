import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type TestDetail,
  type TestListItem,
  type TestRepository,
} from '@/features/teacher/test'
import { TestTestRepository } from '@/test/repositories'
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
    getTest: vi.fn(),
    compareTests: vi.fn(),
    getQuestionGazeAnalysis: vi.fn().mockResolvedValue({ status: 'NO_DATA', analysis: null }),
    ...overrides,
  }
}

beforeEach(() => setActivePinia(createPinia()))

describe('Test store', () => {
  it('keeps a resolved empty history visible during a background refresh', async () => {
    const pending = deferred<readonly TestListItem[]>()
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValueOnce([]).mockReturnValueOnce(pending.promise),
      }),
    )
    await store.loadForStudent(1)

    const refresh = store.refreshForStudent(1)

    expect(store.listStatus).toBe('success')
    expect(store.tests).toEqual([])
    pending.resolve([])
    await expect(refresh).resolves.toBe(true)
    expect(store.listStatus).toBe('success')
  })

  it('preserves chart source references when a background refresh returns identical data', async () => {
    const mock = new TestTestRepository()
    const store = useTestStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    const previousComparison = store.comparisonResult
    const previousTrend = store.trendDetails

    await expect(store.refreshForStudent(1)).resolves.toBe(true)

    expect(store.comparisonResult).toBe(previousComparison)
    expect(store.trendDetails).toBe(previousTrend)
  })

  it('최신 완료 검사 커리큘럼을 기본 선택하고 단일 상세를 요청한다', async () => {
    const mock = new TestTestRepository()
    const compareTests = vi.spyOn(mock, 'compareTests')
    const store = useTestStore()
    store.setRepository(mock)

    await store.loadForStudent(1)

    expect(store.tests.map((test) => test.testCurriculumId)).toEqual([
      '1011',
      '1008',
      '1005',
      '1004',
    ])
    expect(store.currentTestCurriculumId).toBe('1011')
    expect(store.comparisonTestCurriculumIds).toEqual([])
    expect(store.comparisonResult?.currentTest.questions).toHaveLength(9)
    expect(compareTests).toHaveBeenCalledWith(
      1,
      '1011',
      [],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('비교 검사를 최대 두 건만 추가하고 개별 해제한다', async () => {
    const store = useTestStore()
    store.setRepository(new TestTestRepository())
    await store.loadForStudent(1)

    await expect(store.addComparisonTest(1, '1008')).resolves.toBe(true)
    await expect(store.addComparisonTest(1, '1005')).resolves.toBe(true)
    await expect(store.addComparisonTest(1, '1004')).resolves.toBe(false)
    expect(store.comparisonTestCurriculumIds).toEqual(['1008', '1005'])

    await expect(store.removeComparisonTest(1, '1008')).resolves.toBe(true)
    expect(store.comparisonTestCurriculumIds).toEqual(['1005'])
    expect(store.comparisonResult?.comparisonTests.map((test) => test.testCurriculumId)).toEqual([
      '1005',
    ])
  })

  it('검사 목록 재조회 실패 시 이전 결과를 유지한다', async () => {
    const mock = new TestTestRepository()
    const getTests = vi
      .fn()
      .mockResolvedValueOnce(await mock.getTests(1))
      .mockRejectedValueOnce(
        new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'internal details' }),
      )
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        getTest: vi
          .fn()
          .mockImplementation((studentId, id, options) => mock.getTest(studentId, id, options)),
        compareTests: vi
          .fn()
          .mockImplementation((studentId, id, ids, options) =>
            mock.compareTests(studentId, id, ids, options),
          ),
      }),
    )
    await store.loadForStudent(1)
    const previousIds = store.tests.map((test) => test.testCurriculumId)

    await store.retryList()

    expect(store.listStatus).toBe('error')
    expect(store.tests.map((test) => test.testCurriculumId)).toEqual(previousIds)
    expect(store.listError).not.toContain('internal')
  })

  it('전체 검사 상세 일부가 실패해도 성공 결과만 평균에 유지한다', async () => {
    const mock = new TestTestRepository({ failedDetailTestCurriculumIds: ['1005'] })
    const store = useTestStore()
    store.setRepository(mock)

    await store.loadForStudent(1)

    expect(store.trendStatus).toBe('success')
    expect(store.trendFailedCount).toBe(1)
    expect(store.trendDetails.map((detail) => detail.testCurriculumId)).toEqual([
      '1004',
      '1008',
      '1011',
    ])
    expect(store.trendError).toContain('일부 검사 상세 1건')
  })

  it('빠른 기준 변경에서 늦게 끝난 이전 상세 응답을 무시한다', async () => {
    const oldDetail = deferred<TestDetail>()
    const mock = new TestTestRepository()
    const compareTests = vi.fn().mockImplementation(async (studentId, id, ids, options) => {
      if (id === '1008') {
        return { currentTest: await oldDetail.promise, comparisonTests: [] }
      }
      return mock.compareTests(studentId, id, ids, options)
    })
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        getTest: vi
          .fn()
          .mockImplementation((studentId, id, options) => mock.getTest(studentId, id, options)),
        compareTests,
      }),
    )
    await store.loadForStudent(1)

    const oldRequest = store.selectCurrentTest(1, '1008')
    await store.selectCurrentTest(1, '1005')
    oldDetail.resolve(await mock.getTest(1, '1008'))
    await oldRequest

    expect(store.currentTestCurriculumId).toBe('1005')
    expect(store.comparisonResult?.currentTest.testCurriculumId).toBe('1005')
  })

  it('기준 검사를 바꾸는 동안 이전 검사 상세와 시선 결과를 함께 숨긴다', async () => {
    const pending = deferred<TestDetail>()
    const mock = new TestTestRepository()
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        getTest: vi
          .fn()
          .mockImplementation((studentId, id, options) => mock.getTest(studentId, id, options)),
        compareTests: vi
          .fn()
          .mockImplementation((studentId, id, ids, options) =>
            id === '1008'
              ? pending.promise.then((currentTest) => ({ currentTest, comparisonTests: [] }))
              : mock.compareTests(studentId, id, ids, options),
          ),
        getQuestionGazeAnalysis: vi
          .fn()
          .mockImplementation((studentId, testId, questionNo, options) =>
            mock.getQuestionGazeAnalysis(studentId, testId, questionNo, options),
          ),
      }),
    )
    await store.loadForStudent(1)
    await store.selectQuestionGaze(1, '10111', 1)

    const selection = store.selectCurrentTest(1, '1008')

    expect(store.comparisonResult).toBeNull()
    expect(store.comparisonStatus).toBe('loading')
    expect(store.selectedQuestionTestId).toBeNull()
    expect(store.questionGazeAnalysis).toBeNull()
    pending.resolve(await mock.getTest(1, '1008'))
    await selection
  })

  it('선택 문항의 시선 집계만 조회하고 다른 학습자의 문항 ID를 차단한다', async () => {
    const mock = new TestTestRepository()
    const getQuestionGazeAnalysis = vi.spyOn(mock, 'getQuestionGazeAnalysis')
    const store = useTestStore()
    store.setRepository(mock)
    await store.loadForStudent(1)

    await expect(store.selectQuestionGaze(1, '10111', 1)).resolves.toBe(true)

    expect(getQuestionGazeAnalysis).toHaveBeenCalledWith(
      1,
      '10111',
      1,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.questionGazeAnalysis?.status).toBe('AVAILABLE')
    await expect(store.selectQuestionGaze(2, '10111', 1)).resolves.toBe(false)
  })

  it('같은 testId의 문항도 questionNo별로 확인하고 시선 분석을 캐시한다', async () => {
    const mock = new TestTestRepository()
    const getQuestionGazeAnalysis = vi.spyOn(mock, 'getQuestionGazeAnalysis')
    const store = useTestStore()
    store.setRepository(mock)
    await store.loadForStudent(1)

    await expect(
      store.loadQuestionGazeAvailability(1, [
        { testId: '10111', questionNo: 1 },
        { testId: '10111', questionNo: 1 },
        { testId: '10111', questionNo: 2 },
      ]),
    ).resolves.toBe(true)

    expect(getQuestionGazeAnalysis).toHaveBeenCalledTimes(2)
    expect(store.questionGazeAvailability).toEqual({
      '10111:1': 'AVAILABLE',
      '10111:2': 'AVAILABLE',
    })
    await expect(store.selectQuestionGaze(1, '10111', 2)).resolves.toBe(true)
    expect(getQuestionGazeAnalysis).toHaveBeenCalledTimes(2)
    expect(store.selectedQuestionNo).toBe(2)
  })

  it('문항별 시선 조회 실패와 재시도를 복합 키에만 반영한다', async () => {
    const mock = new TestTestRepository()
    const available = await mock.getQuestionGazeAnalysis(1, '10111', 2)
    const getQuestionGazeAnalysis = vi
      .fn<TestRepository['getQuestionGazeAnalysis']>()
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(available)
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockResolvedValue(await mock.getTests(1)),
        getTest: vi
          .fn()
          .mockImplementation((studentId, id, options) => mock.getTest(studentId, id, options)),
        compareTests: vi
          .fn()
          .mockImplementation((studentId, id, ids, options) =>
            mock.compareTests(studentId, id, ids, options),
          ),
        getQuestionGazeAnalysis,
      }),
    )
    await store.loadForStudent(1)

    await expect(store.selectQuestionGaze(1, '10111', 2)).resolves.toBe(false)
    expect(store.questionGazeAvailability['10111:2']).toBe('ERROR')

    await store.retryQuestionGaze()

    expect(store.questionGazeStatus).toBe('success')
    expect(store.selectedQuestionNo).toBe(2)
    expect(store.questionGazeAvailability['10111:2']).toBe('AVAILABLE')
    expect(getQuestionGazeAnalysis).toHaveBeenCalledTimes(2)
  })

  it('같은 학습자의 background refresh가 진행 중인 시선 요청을 중단하지 않는다', async () => {
    const pendingGaze = deferred<
      Awaited<ReturnType<TestRepository['getQuestionGazeAnalysis']>>
    >()
    const mock = new TestTestRepository()
    let gazeSignal: AbortSignal | undefined
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests: vi.fn().mockImplementation((studentId, options) =>
          mock.getTests(studentId, options),
        ),
        getTest: vi.fn().mockImplementation((studentId, id, options) =>
          mock.getTest(studentId, id, options),
        ),
        compareTests: vi.fn().mockImplementation((studentId, id, ids, options) =>
          mock.compareTests(studentId, id, ids, options),
        ),
        getQuestionGazeAnalysis: vi
          .fn()
          .mockImplementation((_studentId, _testId, _questionNo, options) => {
          gazeSignal = options?.signal
          return pendingGaze.promise
          }),
      }),
    )
    await store.loadForStudent(1)

    const gazeRequest = store.selectQuestionGaze(1, '10111', 1)
    const refresh = store.refreshForStudent(1)

    expect(gazeSignal?.aborted).toBe(false)
    pendingGaze.resolve({ status: 'NO_DATA', analysis: null })
    await expect(gazeRequest).resolves.toBe(true)
    await expect(refresh).resolves.toBe(true)
  })

  it('학습자 변경에서 늦게 끝난 이전 목록 응답을 무시한다', async () => {
    const oldList = deferred<readonly TestListItem[]>()
    const mock = new TestTestRepository()
    const getTests = vi
      .fn()
      .mockReturnValueOnce(oldList.promise)
      .mockResolvedValueOnce(await mock.getTests(2))
    const store = useTestStore()
    store.setRepository(
      repository({
        getTests,
        getTest: vi
          .fn()
          .mockImplementation((studentId, id, options) => mock.getTest(studentId, id, options)),
        compareTests: vi
          .fn()
          .mockImplementation((studentId, id, ids, options) =>
            mock.compareTests(studentId, id, ids, options),
          ),
      }),
    )

    const firstRequest = store.loadForStudent(1)
    await store.loadForStudent(2)
    oldList.resolve(await mock.getTests(1))
    await firstRequest

    expect(store.studentId).toBe(2)
    expect(store.currentTestCurriculumId).toBe('2001')
  })

  it('403 오류를 권한 안내로 변환하고 고정 결과를 표시하지 않는다', async () => {
    const store = useTestStore()
    store.setRepository(new TestTestRepository({ forbiddenStudentIds: [1] }))

    await store.loadForStudent(1)

    expect(store.listStatus).toBe('error')
    expect(store.listError).toBe('이 학습자의 검사 기록을 볼 권한이 없습니다.')
    expect(store.tests).toEqual([])
  })
})

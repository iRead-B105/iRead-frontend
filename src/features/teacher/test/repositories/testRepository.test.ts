import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { createTestApi, type TestApi } from '../api'
import { ApiTestRepository } from './apiTestRepository'
import { MockTestRepository } from './mockTestRepository'
import { assertTestComparisonSelection, type TestRepository } from './testRepository'

describe('Test API', () => {
  it('Backend 관리자 응답의 questions가 비어 있으면 Web도 빈 문항 목록을 유지한다', async () => {
    const request = vi.fn().mockResolvedValue({
      currentTest: {
        testId: 11,
        date: '2026-07-24',
        questions: [],
      },
      comparisonTests: [],
    })
    const api = createTestApi(request)

    const result = await api.compareTests(1, 11, [])

    expect(result.currentTest.testId).toBe(11)
    expect(result.currentTest.questions).toEqual([])
  })

  it('비교 검사가 0건이면 comparisonTestIds query를 생략한다', async () => {
    const request = vi.fn().mockResolvedValue({
      currentTest: {
        testId: 11,
        date: '2026-07-24',
        readingTimeSeconds: 0,
        solvingTimeSeconds: null,
        accuracy: 0,
        gazeDepartureCount: 0,
        questions: [],
      },
      comparisonTests: [],
    })
    const api = createTestApi(request)

    const result = await api.compareTests(1, 11, [])

    expect(request).toHaveBeenCalledWith('/api/admin/test/1/compare?currentTestId=11', {})
    expect(result.currentTest).toMatchObject({
      readingTimeSeconds: 0,
      solvingTimeSeconds: null,
      accuracy: 0,
      gazeDepartureCount: 0,
    })
  })

  it('비교 검사 ID를 선택 순서대로 반복 query에 추가한다', async () => {
    const request = vi.fn().mockResolvedValue({
      currentTest: { testId: 11, date: '2026-07-24' },
      comparisonTests: [],
    })
    const api = createTestApi(request)

    await api.compareTests(1, 11, [9, 7])

    expect(request).toHaveBeenCalledWith(
      '/api/admin/test/1/compare?currentTestId=11&comparisonTestIds=9&comparisonTestIds=7',
      {},
    )
  })

  it('완료 검사 목록을 날짜와 testId 기준으로 안정 정렬한다', async () => {
    const request = vi.fn().mockResolvedValue({
      testHistory: [
        { testId: 2, date: '2026-06-01' },
        { testId: 1, date: '2026-07-01' },
        { testId: 3, date: '2026-07-01' },
      ],
    })
    const api = createTestApi(request)

    await expect(api.getTests(1)).resolves.toEqual([
      { testId: 3, date: '2026-07-01' },
      { testId: 1, date: '2026-07-01' },
      { testId: 2, date: '2026-06-01' },
    ])
  })

  it('완료 검사가 없으면 빈 testHistory를 빈 목록으로 반환한다', async () => {
    const request = vi.fn().mockResolvedValue({ testHistory: [] })
    const api = createTestApi(request)

    await expect(api.getTests(1)).resolves.toEqual([])
  })

  it('실제 gazeDepartureCount를 ViewModel로 변환하고 null과 0을 구분한다', async () => {
    const request = vi.fn().mockResolvedValue({
      currentTest: {
        testId: 11,
        date: '2026-07-24',
        gazeDepartureCount: 0,
      },
      comparisonTests: [{ testId: 9, date: '2026-06-24', gazeDepartureCount: null }],
    })
    const api = createTestApi(request)

    const result = await api.compareTests(1, 11, [9])

    expect(result.currentTest.gazeDepartureCount).toBe(0)
    expect(result.comparisonTests[0]?.gazeDepartureCount).toBeNull()
  })

  it('실제 studentId와 testId로 시선 분석 상태를 조회한다', async () => {
    const request = vi.fn().mockResolvedValue({
      gazeSessionId: 61,
      gazeAnalysisId: 71,
      totalDwellTime: 1_500,
      dwellCount: 4,
      regressionCount: 1,
      averageFixationTime: null,
    })
    const api = createTestApi(request)

    await expect(api.getGazeAnalysis(3, 1011)).resolves.toMatchObject({
      status: 'AVAILABLE',
      analysis: { avgVisitedDurationMs: null },
    })
    expect(request).toHaveBeenCalledWith('/api/admin/test/3/1011/gaze-analysis', {})
  })
})

describe('Test Repository', () => {
  it('시선 분석 결과 없음 404만 NO_DATA로 변환한다', async () => {
    const testApi = (error: ApiError): TestApi => ({
      getTests: vi.fn().mockResolvedValue([]),
      compareTests: vi.fn(),
      getGazeAnalysis: vi.fn().mockRejectedValue(error),
    })
    const noAnalysis = new ApiError({
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: '시선 분석 결과를 찾을 수 없습니다.',
    })
    const noAnalysisRepository = new ApiTestRepository(testApi(noAnalysis))

    await expect(noAnalysisRepository.getGazeAnalysis(1, 11)).resolves.toEqual({
      status: 'NO_DATA',
      analysis: null,
    })

    const testNotFound = new ApiError({
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: '테스트를 찾을 수 없습니다.',
    })
    const invalidRepository = new ApiTestRepository(testApi(testNotFound))
    await expect(invalidRepository.getGazeAnalysis(1, 11)).rejects.toBe(testNotFound)
  })

  it('Mock에서 최신 검사를 기본 목록 첫 항목으로 제공하고 단일 상세를 반환한다', async () => {
    const repository = new MockTestRepository()

    const tests = await repository.getTests(1)
    const comparison = await repository.compareTests(1, tests[0]!.testId, [])

    expect(tests.map((test) => test.testId)).toEqual([1_011, 1_008, 1_005, 1_004])
    expect(comparison.currentTest.testId).toBe(1_011)
    expect(comparison.comparisonTests).toEqual([])
  })

  it('비교 검사 순서를 유지하고 null과 0을 구분한다', async () => {
    const repository = new MockTestRepository()

    const comparison = await repository.compareTests(1, 1_011, [1_004, 1_005])

    expect(comparison.comparisonTests.map((test) => test.testId)).toEqual([1_004, 1_005])
    expect(comparison.comparisonTests[0]).toMatchObject({
      readingTimeSeconds: 0,
      accuracy: 0,
      gazeDepartureCount: 0,
    })
    expect(comparison.comparisonTests[1]?.gazeDepartureCount).toBe(8)
  })

  it('기준 중복·비교 중복·세 번째 비교 검사를 Repository에서 차단한다', () => {
    const cases: Array<readonly [readonly number[], string]> = [
      [[11], 'CURRENT_TEST_DUPLICATED'],
      [[9, 9], 'DUPLICATE_COMPARISON_TEST'],
      [[9, 8, 7], 'TOO_MANY_COMPARISON_TESTS'],
    ]

    for (const [comparisonIds, code] of cases) {
      try {
        assertTestComparisonSelection(1, 11, comparisonIds)
        throw new Error('오류가 발생해야 합니다.')
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError)
        expect((error as ApiError).code).toBe(code)
      }
    }
  })

  it('다른 학습자의 검사 ID는 404로 거부한다', async () => {
    const repository: TestRepository = new MockTestRepository()

    await expect(repository.compareTests(2, 1_011, [])).rejects.toMatchObject({
      status: 404,
      code: 'TEST_NOT_FOUND',
    })
  })

  it('검사별 AVAILABLE·NO_DATA·FAILED 시선 상태를 그대로 반환한다', async () => {
    const repository = new MockTestRepository()

    await expect(repository.getGazeAnalysis(1, 1_011)).resolves.toMatchObject({
      status: 'AVAILABLE',
    })
    await expect(repository.getGazeAnalysis(1, 1_008)).resolves.toEqual({
      status: 'NO_DATA',
      analysis: null,
    })
    await expect(repository.getGazeAnalysis(1, 1_005)).resolves.toEqual({
      status: 'FAILED',
      analysis: null,
    })
    await expect(repository.getGazeAnalysis(2, 1_011)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('Mock 부분 실패 Fixture로 상세·시선 요청 오류를 독립 재현한다', async () => {
    const repository = new MockTestRepository({
      failedDetailTestIds: [1_005],
      failedGazeTestIds: [1_008],
    })

    await expect(repository.compareTests(1, 1_005, [])).rejects.toMatchObject({
      status: 500,
      code: 'MOCK_TEST_DETAIL_FAILURE',
    })
    await expect(repository.getGazeAnalysis(1, 1_008)).rejects.toMatchObject({
      status: 500,
      code: 'MOCK_TEST_GAZE_FAILURE',
    })
    await expect(repository.compareTests(1, 1_011, [])).resolves.toMatchObject({
      currentTest: { testId: 1_011 },
    })
  })
})

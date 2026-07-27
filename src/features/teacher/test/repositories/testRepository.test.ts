import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { createTestApi } from '../api'
import { MockTestRepository } from './mockTestRepository'
import {
  assertTestComparisonSelection,
  type TestRepository,
} from './testRepository'

describe('Test API', () => {
  it('비교 검사가 0건이면 comparisonTestIds query를 생략한다', async () => {
    const request = vi.fn().mockResolvedValue({
      currentTest: {
        testId: 11,
        date: '2026-07-24',
        readingTimeSeconds: 0,
        solvingTimeSeconds: null,
        accuracy: 0,
        questions: [],
      },
      comparisonTests: [],
    })
    const api = createTestApi(request)

    const result = await api.compareTests(1, 11, [])

    expect(request).toHaveBeenCalledWith(
      '/api/admin/test/1/compare?currentTestId=11',
      {},
    )
    expect(result.currentTest).toMatchObject({
      overallScore: null,
      readingTimeSeconds: 0,
      solvingTimeSeconds: null,
      accuracy: 0,
      areaScores: [],
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
    const request = vi.fn().mockResolvedValue([
      { testId: 2, date: '2026-06-01' },
      { testId: 1, date: '2026-07-01' },
      { testId: 3, date: '2026-07-01' },
    ])
    const api = createTestApi(request)

    await expect(api.getTests(1)).resolves.toEqual([
      { testId: 3, date: '2026-07-01' },
      { testId: 1, date: '2026-07-01' },
      { testId: 2, date: '2026-06-01' },
    ])
  })

  it('0~100 범위를 벗어난 영역별 점수를 응답 계약 오류로 거부한다', async () => {
    const request = vi.fn().mockResolvedValue({
      currentTest: {
        testId: 11,
        date: '2026-07-24',
        areaScores: [{ area: '문장 이해', score: 101 }],
      },
      comparisonTests: [],
    })
    const api = createTestApi(request)

    await expect(api.compareTests(1, 11, [])).rejects.toThrow(
      '영역별 점수는 0~100이어야 합니다.',
    )
  })
})

describe('Test Repository', () => {
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

    expect(comparison.comparisonTests.map((test) => test.testId)).toEqual([
      1_004,
      1_005,
    ])
    expect(comparison.comparisonTests[0]).toMatchObject({
      overallScore: 0,
      changeFromPrevious: 0,
      readingTimeSeconds: 0,
      accuracy: 0,
    })
    expect(comparison.comparisonTests[1]?.changeFromPrevious).toBeNull()
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
})

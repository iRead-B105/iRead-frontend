import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { createTestApi } from '../api'
import { ApiTestRepository } from './apiTestRepository'
import { TestTestRepository } from '@/test/repositories'
import { assertTestComparisonSelection } from './testRepository'

function detailDto(id = '11') {
  return {
    testCurriculumId: id,
    status: 'COMPLETED',
    createdAt: '2026-07-24T10:00:00',
    completedAt: '2026-07-24T10:30:00',
    completedQuestions: 9,
    totalQuestions: 9,
    overallScore: 0,
    areaScores: [
      {
        trackCode: 'PHONOLOGICAL_AWARENESS',
        title: '음운 인식',
        score: 0,
        completedQuestions: 3,
        totalQuestions: 3,
      },
    ],
    solvingTimeSeconds: 0,
    questions: [
      {
        testId: '102',
        sequenceNo: 2,
        trackCode: 'PHONOLOGICAL_AWARENESS',
        questionType: 'VOICE',
        question: '둘째 문항',
        responseType: 'VOICE',
        selectedAnswer: { transcript: '나비' },
        correctAnswer: '나비',
        correct: true,
        score: 0,
        pronunciationScore: 0,
        solvingTimeSeconds: 0,
        gazeDepartureCount: 0,
      },
      {
        testId: '101',
        sequenceNo: 1,
        trackCode: 'PHONOLOGICAL_AWARENESS',
        questionType: 'SINGLE_CHOICE',
        question: '첫째 문항',
        responseType: 'SINGLE_CHOICE',
        selectedAnswer: null,
        correctAnswer: ['가', '나'],
        correct: null,
        score: null,
        pronunciationScore: null,
        solvingTimeSeconds: null,
        gazeDepartureCount: null,
      },
    ],
    recommendationStatus: 'COMPLETED',
    recommendationRetryCount: 0,
    dailyCurriculumId: 201,
  }
}

describe('Test API', () => {
  it('검사 목록을 testCurriculumId 단위로 최신 완료 시각순 정렬한다', async () => {
    const request = vi.fn().mockResolvedValue({
      curriculums: [
        { ...detailDto('2'), completedAt: '2026-06-01T10:00:00' },
        { ...detailDto('1'), completedAt: '2026-07-01T10:00:00' },
        { ...detailDto('3'), completedAt: '2026-07-01T10:00:00' },
      ],
    })
    const api = createTestApi(request)

    const result = await api.getTests(7)

    expect(request).toHaveBeenCalledWith('/api/admin/test/7/curriculums', {})
    expect(result.map((item) => item.testCurriculumId)).toEqual(['3', '1', '2'])
  })

  it('상세 9문항 계약을 순서대로 변환하고 null과 실제 0을 유지한다', async () => {
    const request = vi.fn().mockResolvedValue(detailDto())
    const api = createTestApi(request)

    const result = await api.getTest(7, '11')

    expect(request).toHaveBeenCalledWith('/api/admin/test/7/curriculums/11', {})
    expect(result.questions.map((question) => question.sequenceNo)).toEqual([1, 2])
    expect(result.questions[0]).toMatchObject({ score: null, gazeDepartureCount: null })
    expect(result.questions[1]).toMatchObject({ score: 0, gazeDepartureCount: 0 })
    expect(result.overallScore).toBe(0)
    expect(result.solvingTimeSeconds).toBe(0)
  })

  it('JavaScript 안전 정수 범위를 넘는 검사 ID를 손실 없이 상세 URL에 사용한다', async () => {
    const unsafeId = '1739619061890340497'
    const request = vi.fn().mockResolvedValue(detailDto(unsafeId))
    const api = createTestApi(request)

    const result = await api.getTest(7, unsafeId)

    expect(request).toHaveBeenCalledWith(`/api/admin/test/7/curriculums/${unsafeId}`, {})
    expect(result.testCurriculumId).toBe(unsafeId)
  })

  it('문항별 시선 이탈은 측정된 값만 합하고 발음 점수는 측정 문항만 평균낸다', async () => {
    const request = vi.fn().mockResolvedValue(detailDto())
    const result = await createTestApi(request).getTest(7, '11')

    expect(result.gazeDepartureCount).toBe(0)
    expect(result.pronunciationScore).toBe(0)
  })

  it('개별 검사 문항 ID로 기존 시선 집계 API를 조회한다', async () => {
    const request = vi.fn().mockResolvedValue({
      gazeSessionId: 91,
      gazeAnalysisId: 92,
      totalDwellTime: 1_200,
      dwellCount: 4,
      regressionCount: 1,
      averageFixationTime: 300,
    })

    const result = await createTestApi(request).getGazeAnalysis(7, '101')

    expect(request).toHaveBeenCalledWith('/api/admin/test/7/101/gaze-analysis', {})
    expect(result).toMatchObject({
      status: 'AVAILABLE',
      analysis: {
        totalVisitedDurationMs: 1_200,
        totalVisitedCount: 4,
        reverseReadCount: 1,
      },
    })
  })
})

describe('Test Repository', () => {
  it('비교할 검사 커리큘럼 상세을 각각 현재 상세 API로 조회한다', async () => {
    const repository = new TestTestRepository()
    const compare = await repository.compareTests(1, '1011', ['1008', '1005'])

    expect(compare.currentTest.testCurriculumId).toBe('1011')
    expect(compare.comparisonTests.map((item) => item.testCurriculumId)).toEqual(['1008', '1005'])
  })

  it('Api Repository가 현재·비교 상세의 요청 순서를 유지한다', async () => {
    const getTest = vi.fn().mockImplementation((_studentId: number, id: string) =>
      Promise.resolve({
        ...detailDto(id),
        areaScores: [],
        gazeDepartureCount: 0,
        pronunciationScore: 0,
      }),
    )
    const repository = new ApiTestRepository({
      getTests: vi.fn(),
      getTest,
      getGazeAnalysis: vi.fn(),
    })

    const result = await repository.compareTests(1, '11', ['9', '7'])

    expect(getTest.mock.calls.map((call) => call[1])).toEqual(['11', '9', '7'])
    expect(result.comparisonTests.map((item) => item.testCurriculumId)).toEqual(['9', '7'])
  })

  it('기준 중복·비교 중복·세 번째 비교 검사를 차단한다', () => {
    const cases: Array<readonly [readonly string[], string]> = [
      [['11'], 'CURRENT_TEST_DUPLICATED'],
      [['9', '9'], 'DUPLICATE_COMPARISON_TEST'],
      [['9', '8', '7'], 'TOO_MANY_COMPARISON_TESTS'],
    ]
    for (const [ids, code] of cases) {
      expect(() => assertTestComparisonSelection(1, '11', ids)).toThrowError(
        expect.objectContaining({ code }) as ApiError,
      )
    }
  })

  it('다른 학습자의 검사 커리큘럼 ID는 404로 거부한다', async () => {
    await expect(new TestTestRepository().getTest(2, '1011')).rejects.toMatchObject({
      status: 404,
      code: 'TEST_CURRICULUM_NOT_FOUND',
    })
  })

  it('시선 분석 결과만 없는 404는 NO_DATA로 변환한다', async () => {
    const notFound = new ApiError({
      status: 404,
      code: 'GAZE_ANALYSIS_NOT_FOUND',
      message: '시선 분석 결과를 찾을 수 없습니다.',
    })
    const repository = new ApiTestRepository({
      getTests: vi.fn(),
      getTest: vi.fn(),
      getGazeAnalysis: vi.fn().mockRejectedValue(notFound),
    })

    await expect(repository.getGazeAnalysis(1, '101')).resolves.toEqual({
      status: 'NO_DATA',
      analysis: null,
    })
  })
})

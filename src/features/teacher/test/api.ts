import { apiRequest } from '@/lib/api'
import {
  mapGazeAnalysisState,
  type GazeAnalysisState,
  type GazeAnalysisStateDto,
} from '@/features/teacher/gaze'
import type {
  TestAreaScore,
  TestComparison,
  TestDetail,
  TestListItem,
  TestQuestionResult,
} from './model'
import type { TestRequestOptions } from './repositories/testRepository'

export type TestApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

interface TestListItemDto {
  readonly testId: number
  readonly date: string
}

interface TestAreaScoreDto {
  readonly area: string
  readonly score: number
}

interface TestQuestionResultDto {
  readonly questionNumber: number
  readonly question?: string | null
  readonly isCorrect?: boolean | null
  readonly correctAnswer?: string | null
  readonly selectedAnswer?: string | null
}

interface TestDetailDto {
  readonly testId: number
  readonly date: string
  readonly overallScore?: number | null
  readonly changeFromPrevious?: number | null
  readonly strengthAreas?: readonly string[] | null
  readonly improvementAreas?: readonly string[] | null
  readonly recommendedCourse?: string | null
  readonly nextTestRecommendation?: string | null
  readonly areaScores?: readonly TestAreaScoreDto[] | null
  readonly readingTimeSeconds?: number | null
  readonly solvingTimeSeconds?: number | null
  readonly accuracy?: number | null
  readonly questions?: readonly TestQuestionResultDto[] | null
}

interface TestComparisonDto {
  readonly currentTest: TestDetailDto
  readonly comparisonTests?: readonly TestDetailDto[] | null
}

function requestInit(options?: TestRequestOptions): RequestInit {
  return options?.signal ? { signal: options.signal } : {}
}

function mapAreaScore(dto: TestAreaScoreDto): TestAreaScore {
  if (!Number.isFinite(dto.score) || dto.score < 0 || dto.score > 100) {
    throw new TypeError(
      `[검사 API] 영역별 점수는 0~100이어야 합니다. 현재 값: ${String(dto.score)}`,
    )
  }
  return {
    area: dto.area,
    score: dto.score,
  }
}

function mapQuestion(dto: TestQuestionResultDto): TestQuestionResult {
  return {
    questionNumber: dto.questionNumber,
    question: dto.question ?? null,
    isCorrect: dto.isCorrect ?? null,
    correctAnswer: dto.correctAnswer ?? null,
    selectedAnswer: dto.selectedAnswer ?? null,
  }
}

function mapDetail(dto: TestDetailDto): TestDetail {
  return {
    testId: dto.testId,
    date: dto.date,
    overallScore: dto.overallScore ?? null,
    changeFromPrevious: dto.changeFromPrevious ?? null,
    strengthAreas: [...(dto.strengthAreas ?? [])],
    improvementAreas: [...(dto.improvementAreas ?? [])],
    recommendedCourse: dto.recommendedCourse ?? null,
    nextTestRecommendation: dto.nextTestRecommendation ?? null,
    areaScores: (dto.areaScores ?? []).map(mapAreaScore),
    readingTimeSeconds: dto.readingTimeSeconds ?? null,
    solvingTimeSeconds: dto.solvingTimeSeconds ?? null,
    accuracy: dto.accuracy ?? null,
    questions: (dto.questions ?? []).map(mapQuestion),
  }
}

export interface TestApi {
  readonly getTests: (
    studentId: number,
    options?: TestRequestOptions,
  ) => Promise<readonly TestListItem[]>
  readonly compareTests: (
    studentId: number,
    currentTestId: number,
    comparisonTestIds: readonly number[],
    options?: TestRequestOptions,
  ) => Promise<TestComparison>
  readonly getGazeAnalysis: (
    studentId: number,
    testId: number,
    options?: TestRequestOptions,
  ) => Promise<GazeAnalysisState>
}

export function createTestApi(request: TestApiRequest = apiRequest): TestApi {
  return {
    async getTests(studentId, options) {
      const dto = await request<readonly TestListItemDto[]>(
        `/api/admin/test/${studentId}/list`,
        requestInit(options),
      )
      return [...dto]
        .sort((left, right) => right.date.localeCompare(left.date) || right.testId - left.testId)
        .map((item) => ({ ...item }))
    },
    async compareTests(studentId, currentTestId, comparisonTestIds, options) {
      const query = new URLSearchParams({ currentTestId: String(currentTestId) })
      comparisonTestIds.forEach((testId) => {
        query.append('comparisonTestIds', String(testId))
      })
      const dto = await request<TestComparisonDto>(
        `/api/admin/test/${studentId}/compare?${query.toString()}`,
        requestInit(options),
      )
      return {
        currentTest: mapDetail(dto.currentTest),
        comparisonTests: (dto.comparisonTests ?? []).map(mapDetail),
      }
    },
    async getGazeAnalysis(studentId, testId, options) {
      const dto = await request<GazeAnalysisStateDto>(
        `/api/admin/test/${studentId}/${testId}/gaze-analysis`,
        requestInit(options),
      )
      return mapGazeAnalysisState(dto)
    },
  }
}

import { apiRequest } from '@/lib/api'
import {
  mapRawGazeAnalysis,
  type GazeAnalysisState,
  type RawGazeAnalysisDto,
} from '@/features/teacher/gaze'
import type {
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

interface TestListDataDto {
  readonly testHistory: readonly TestListItemDto[]
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
  readonly readingTimeSeconds?: number | null
  readonly solvingTimeSeconds?: number | null
  readonly accuracy?: number | null
  readonly gazeDepartureCount?: number | null
  readonly questions?: readonly TestQuestionResultDto[] | null
}

interface TestComparisonDto {
  readonly currentTest: TestDetailDto
  readonly comparisonTests?: readonly TestDetailDto[] | null
}

function requestInit(options?: TestRequestOptions): RequestInit {
  return options?.signal ? { signal: options.signal } : {}
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
    readingTimeSeconds: dto.readingTimeSeconds ?? null,
    solvingTimeSeconds: dto.solvingTimeSeconds ?? null,
    accuracy: dto.accuracy ?? null,
    gazeDepartureCount: dto.gazeDepartureCount ?? null,
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
      const dto = await request<TestListDataDto>(
        `/api/admin/test/${studentId}/list`,
        requestInit(options),
      )
      return [...dto.testHistory]
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
      const dto = await request<RawGazeAnalysisDto>(
        `/api/admin/test/${studentId}/${testId}/gaze-analysis`,
        requestInit(options),
      )
      return mapRawGazeAnalysis(dto)
    },
  }
}

import { apiRequest } from '@/lib/api'
import type {
  TestAreaScore,
  TestDetail,
  TestListItem,
  TestQuestionResult,
} from './model'
import type { TestRequestOptions } from './repositories/testRepository'

export type TestApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

interface TestListItemDto {
  readonly testCurriculumId: string
  readonly status: string
  readonly createdAt: string
  readonly completedAt?: string | null
  readonly completedQuestions: number
  readonly totalQuestions: number
  readonly overallScore?: number | null
}

interface TestListDataDto {
  readonly curriculums?: readonly TestListItemDto[] | null
}

interface TestAreaScoreDto {
  readonly trackCode: string
  readonly title: string
  readonly score?: number | null
  readonly completedQuestions: number
  readonly totalQuestions: number
}

interface TestQuestionResultDto {
  readonly testId: string
  readonly sequenceNo: number
  readonly trackCode: string
  readonly questionType: string
  readonly question?: string | null
  readonly responseType: string
  readonly selectedAnswer?: unknown
  readonly correctAnswer?: unknown
  readonly correct?: boolean | null
  readonly score?: number | null
  readonly pronunciationScore?: number | null
  readonly solvingTimeSeconds?: number | null
  readonly gazeDepartureCount?: number | null
}

interface TestDetailDto extends TestListItemDto {
  readonly areaScores?: readonly TestAreaScoreDto[] | null
  readonly solvingTimeSeconds?: number | null
  readonly questions?: readonly TestQuestionResultDto[] | null
  readonly recommendationStatus?: string | null
  readonly recommendationError?: string | null
  readonly recommendationLastAttemptAt?: string | null
  readonly recommendationRetryCount?: number | null
  readonly dailyCurriculumId?: number | null
  readonly contentGenerationStatus?: string | null
  readonly teacherReviewStatus?: string | null
}

function requestInit(options?: TestRequestOptions): RequestInit {
  return options?.signal ? { signal: options.signal } : {}
}

function compareDecimalIdsDescending(left: string, right: string): number {
  return right.length - left.length || right.localeCompare(left)
}

function mapListItem(dto: TestListItemDto): TestListItem {
  return {
    testCurriculumId: dto.testCurriculumId,
    status: dto.status,
    createdAt: dto.createdAt,
    completedAt: dto.completedAt ?? null,
    completedQuestions: dto.completedQuestions,
    totalQuestions: dto.totalQuestions,
    overallScore: dto.overallScore ?? null,
  }
}

function mapAreaScore(dto: TestAreaScoreDto): TestAreaScore {
  return {
    trackCode: dto.trackCode,
    title: dto.title,
    score: dto.score ?? null,
    completedQuestions: dto.completedQuestions,
    totalQuestions: dto.totalQuestions,
  }
}

function mapQuestion(dto: TestQuestionResultDto): TestQuestionResult {
  return {
    testId: dto.testId,
    sequenceNo: dto.sequenceNo,
    trackCode: dto.trackCode,
    questionType: dto.questionType,
    question: dto.question ?? null,
    responseType: dto.responseType,
    selectedAnswer: dto.selectedAnswer ?? null,
    correctAnswer: dto.correctAnswer ?? null,
    correct: dto.correct ?? null,
    score: dto.score ?? null,
    pronunciationScore: dto.pronunciationScore ?? null,
    solvingTimeSeconds: dto.solvingTimeSeconds ?? null,
    gazeDepartureCount: dto.gazeDepartureCount ?? null,
  }
}

function sumMeasured(values: readonly (number | null)[]): number | null {
  const measured = values.filter((value): value is number => value !== null)
  return measured.length === 0 ? null : measured.reduce((sum, value) => sum + value, 0)
}

function averageMeasured(values: readonly (number | null)[]): number | null {
  const measured = values.filter((value): value is number => value !== null)
  if (measured.length === 0) return null
  return Math.round((measured.reduce((sum, value) => sum + value, 0) / measured.length) * 10) / 10
}

function mapDetail(dto: TestDetailDto): TestDetail {
  const questions = [...(dto.questions ?? [])]
    .sort(
      (left, right) =>
        left.sequenceNo - right.sequenceNo || left.testId.localeCompare(right.testId),
    )
    .map(mapQuestion)
  return {
    ...mapListItem(dto),
    areaScores: (dto.areaScores ?? []).map(mapAreaScore),
    solvingTimeSeconds: dto.solvingTimeSeconds ?? null,
    gazeDepartureCount: sumMeasured(questions.map((question) => question.gazeDepartureCount)),
    pronunciationScore: averageMeasured(questions.map((question) => question.pronunciationScore)),
    questions,
    recommendationStatus: dto.recommendationStatus ?? null,
    recommendationError: dto.recommendationError ?? null,
    recommendationLastAttemptAt: dto.recommendationLastAttemptAt ?? null,
    recommendationRetryCount: dto.recommendationRetryCount ?? 0,
    dailyCurriculumId: dto.dailyCurriculumId ?? null,
    contentGenerationStatus: dto.contentGenerationStatus ?? null,
    teacherReviewStatus: dto.teacherReviewStatus ?? null,
  }
}

export interface TestApi {
  readonly getTests: (
    studentId: number,
    options?: TestRequestOptions,
  ) => Promise<readonly TestListItem[]>
  readonly getTest: (
    studentId: number,
    testCurriculumId: string,
    options?: TestRequestOptions,
  ) => Promise<TestDetail>
}

export function createTestApi(request: TestApiRequest = apiRequest): TestApi {
  return {
    async getTests(studentId, options) {
      const dto = await request<TestListDataDto>(
        `/api/admin/test/${studentId}/curriculums`,
        requestInit(options),
      )
      return [...(dto.curriculums ?? [])]
        .sort(
          (left, right) =>
            (right.completedAt ?? right.createdAt).localeCompare(
              left.completedAt ?? left.createdAt,
            ) ||
            compareDecimalIdsDescending(left.testCurriculumId, right.testCurriculumId),
        )
        .map(mapListItem)
    },
    async getTest(studentId, testCurriculumId, options) {
      const dto = await request<TestDetailDto>(
        `/api/admin/test/${studentId}/curriculums/${testCurriculumId}`,
        requestInit(options),
      )
      return mapDetail(dto)
    },
  }
}

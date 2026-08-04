import { apiRequest } from '@/lib/api'
import {
  mapRawGazeAnalysis,
  type GazeAnalysisState,
  type RawGazeAnalysisDto,
} from '@/features/teacher/gaze'
import type { TestAreaScore, TestDetail, TestListItem, TestQuestionResult } from './model'
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
  readonly questionNo: number
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
}

interface TestQuestionGazeWordMetricDto {
  readonly targetIndex?: number | null
  readonly tokenIndex?: number | null
  readonly text?: string | null
  readonly dwellDurationMs?: number | null
  readonly visitCount?: number | null
  readonly skipped?: boolean | null
  readonly regressionCount?: number | null
  readonly firstSeenMs?: number | null
  readonly lastSeenMs?: number | null
}

interface TestQuestionGazeAnalysisDto extends RawGazeAnalysisDto {
  readonly testId: string | number
  readonly questionNo: number
  readonly wordMetrics?: readonly TestQuestionGazeWordMetricDto[] | null
  readonly analysisMeta: Readonly<Record<string, unknown>>
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
    questionNo: dto.questionNo,
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
        left.sequenceNo - right.sequenceNo ||
        left.testId.localeCompare(right.testId) ||
        left.questionNo - right.questionNo,
    )
    .map(mapQuestion)
  return {
    ...mapListItem(dto),
    areaScores: (dto.areaScores ?? []).map(mapAreaScore),
    solvingTimeSeconds: dto.solvingTimeSeconds ?? null,
    gazeDepartureCount: sumMeasured(questions.map((question) => question.gazeDepartureCount)),
    pronunciationScore: averageMeasured(questions.map((question) => question.pronunciationScore)),
    questions,
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
  readonly getQuestionGazeAnalysis: (
    studentId: number,
    testId: string,
    questionNo: number,
    options?: TestRequestOptions,
  ) => Promise<GazeAnalysisState>
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
            ) || compareDecimalIdsDescending(left.testCurriculumId, right.testCurriculumId),
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
    async getQuestionGazeAnalysis(studentId, testId, questionNo, options) {
      const dto = await request<TestQuestionGazeAnalysisDto>(
        `/api/admin/test/${studentId}/${testId}/questions/${questionNo}/gaze-analysis`,
        requestInit(options),
      )
      if (dto.questionNo !== questionNo) {
        throw new TypeError('[검사 문항 시선 API] 요청과 응답의 questionNo가 일치하지 않습니다.')
      }
      return mapRawGazeAnalysis({
        ...dto,
        replay: {
          words: (dto.wordMetrics ?? []).map((word) => ({
            questionNo,
            targetIndex: word.targetIndex ?? null,
            tokenIndex: word.tokenIndex ?? null,
            text: word.text ?? '',
            dwellMs: word.dwellDurationMs ?? 0,
            visitCount: word.visitCount ?? 0,
            skipped: word.skipped ?? false,
            regressionCount: word.regressionCount ?? 0,
            firstSeenMs: word.firstSeenMs ?? null,
            lastSeenMs: word.lastSeenMs ?? null,
          })),
          samples: [],
        },
      })
    },
  }
}

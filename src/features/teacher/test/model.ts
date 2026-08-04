export type TestRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export type TestCurriculumStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | string

export interface TestListItem {
  readonly testCurriculumId: string
  readonly status: TestCurriculumStatus
  readonly createdAt: string
  readonly completedAt: string | null
  readonly completedQuestions: number
  readonly totalQuestions: number
  readonly overallScore: number | null
}

export interface TestAreaScore {
  readonly trackCode: string
  readonly title: string
  readonly score: number | null
  readonly completedQuestions: number
  readonly totalQuestions: number
}

export type TestAnswer = unknown

export interface TestQuestionResult {
  readonly testId: string
  readonly questionNo: number
  readonly sequenceNo: number
  readonly trackCode: string
  readonly questionType: string
  readonly question: string | null
  readonly responseType: string
  readonly selectedAnswer: TestAnswer
  readonly correctAnswer: TestAnswer
  readonly correct: boolean | null
  readonly score: number | null
  readonly pronunciationScore: number | null
  readonly solvingTimeSeconds: number | null
  readonly gazeDepartureCount: number | null
}

export interface TestDetail extends TestListItem {
  readonly areaScores: readonly TestAreaScore[]
  readonly solvingTimeSeconds: number | null
  readonly gazeDepartureCount: number | null
  readonly pronunciationScore: number | null
  readonly questions: readonly TestQuestionResult[]
}

export interface TestComparison {
  readonly currentTest: TestDetail
  readonly comparisonTests: readonly TestDetail[]
}

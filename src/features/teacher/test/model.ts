export type TestRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export interface TestListItem {
  readonly testId: number
  readonly date: string
}

export interface TestAreaScore {
  readonly area: string
  readonly score: number
}

export interface TestQuestionResult {
  readonly questionNumber: number
  readonly question: string | null
  readonly isCorrect: boolean | null
  readonly correctAnswer: string | null
  readonly selectedAnswer: string | null
}

export interface TestDetail {
  readonly testId: number
  readonly date: string
  readonly overallScore: number | null
  readonly changeFromPrevious: number | null
  readonly strengthAreas: readonly string[]
  readonly improvementAreas: readonly string[]
  readonly recommendedCourse: string | null
  readonly nextTestRecommendation: string | null
  readonly areaScores: readonly TestAreaScore[]
  readonly readingTimeSeconds: number | null
  readonly solvingTimeSeconds: number | null
  readonly accuracy: number | null
  readonly questions: readonly TestQuestionResult[]
}

export interface TestComparison {
  readonly currentTest: TestDetail
  readonly comparisonTests: readonly TestDetail[]
}

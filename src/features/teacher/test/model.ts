import type { GazeAnalysisState } from '@/features/teacher/gaze'

export type TestRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export interface TestListItem {
  readonly testId: number
  readonly date: string
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
  readonly readingTimeSeconds: number | null
  readonly solvingTimeSeconds: number | null
  readonly accuracy: number | null
  readonly gazeDepartureCount: number | null
  readonly questions: readonly TestQuestionResult[]
}

export interface TestGazeResult {
  readonly testId: number
  readonly state: GazeAnalysisState
}

export interface TestComparison {
  readonly currentTest: TestDetail
  readonly comparisonTests: readonly TestDetail[]
}

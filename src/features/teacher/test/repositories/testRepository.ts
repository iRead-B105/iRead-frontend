import { ApiError } from '@/lib/api'
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import type { TestComparison, TestListItem } from '../model'

export interface TestRequestOptions {
  readonly signal?: AbortSignal
}

export interface TestRepository {
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

export function assertPositiveId(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_ID',
      message: `${name}은 양의 정수여야 합니다.`,
    })
  }
}

export function assertTestComparisonSelection(
  studentId: number,
  currentTestId: number,
  comparisonTestIds: readonly number[],
): void {
  assertPositiveId(studentId, 'studentId')
  assertPositiveId(currentTestId, 'currentTestId')
  if (comparisonTestIds.length > 2) {
    throw new ApiError({
      status: 400,
      code: 'TOO_MANY_COMPARISON_TESTS',
      message: '비교 검사는 최대 두 건까지 선택할 수 있습니다.',
    })
  }
  comparisonTestIds.forEach((testId) => assertPositiveId(testId, 'comparisonTestId'))
  if (comparisonTestIds.includes(currentTestId)) {
    throw new ApiError({
      status: 400,
      code: 'CURRENT_TEST_DUPLICATED',
      message: '기준 검사는 비교 검사로 선택할 수 없습니다.',
    })
  }
  if (new Set(comparisonTestIds).size !== comparisonTestIds.length) {
    throw new ApiError({
      status: 400,
      code: 'DUPLICATE_COMPARISON_TEST',
      message: '같은 비교 검사를 중복해서 선택할 수 없습니다.',
    })
  }
}

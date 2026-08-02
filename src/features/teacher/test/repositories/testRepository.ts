import { ApiError } from '@/lib/api'
import type { TestComparison, TestDetail, TestListItem } from '../model'

export interface TestRequestOptions {
  readonly signal?: AbortSignal
}

export interface TestRepository {
  readonly getTests: (
    studentId: number,
    options?: TestRequestOptions,
  ) => Promise<readonly TestListItem[]>
  readonly getTest: (
    studentId: number,
    testCurriculumId: string,
    options?: TestRequestOptions,
  ) => Promise<TestDetail>
  readonly compareTests: (
    studentId: number,
    currentTestCurriculumId: string,
    comparisonTestCurriculumIds: readonly string[],
    options?: TestRequestOptions,
  ) => Promise<TestComparison>
}

export function assertPositiveId(value: number | string, name: string): void {
  const valid =
    typeof value === 'number'
      ? Number.isInteger(value) && value > 0
      : /^[1-9]\d*$/.test(value)
  if (!valid) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_ID',
      message: `${name}은 양의 정수여야 합니다.`,
    })
  }
}

export function assertTestComparisonSelection(
  studentId: number,
  currentTestCurriculumId: string,
  comparisonTestCurriculumIds: readonly string[],
): void {
  assertPositiveId(studentId, 'studentId')
  assertPositiveId(currentTestCurriculumId, 'currentTestCurriculumId')
  if (comparisonTestCurriculumIds.length > 2) {
    throw new ApiError({
      status: 400,
      code: 'TOO_MANY_COMPARISON_TESTS',
      message: '비교 검사는 최대 두 건까지 선택할 수 있습니다.',
    })
  }
  comparisonTestCurriculumIds.forEach((id) => assertPositiveId(id, 'comparisonTestCurriculumId'))
  if (comparisonTestCurriculumIds.includes(currentTestCurriculumId)) {
    throw new ApiError({
      status: 400,
      code: 'CURRENT_TEST_DUPLICATED',
      message: '기준 검사는 비교 검사로 선택할 수 없습니다.',
    })
  }
  if (new Set(comparisonTestCurriculumIds).size !== comparisonTestCurriculumIds.length) {
    throw new ApiError({
      status: 400,
      code: 'DUPLICATE_COMPARISON_TEST',
      message: '같은 비교 검사를 중복해서 선택할 수 없습니다.',
    })
  }
}

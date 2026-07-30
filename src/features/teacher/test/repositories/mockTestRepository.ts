import { ApiError } from '@/lib/api'
import { testGazeFixtures, type GazeAnalysisState } from '@/features/teacher/gaze'
import { testDetailFixtures, testListFixtures } from '../fixtures'
import type { TestDetail, TestListItem } from '../model'
import {
  assertTestComparisonSelection,
  type TestRepository,
  type TestRequestOptions,
} from './testRepository'

export interface MockTestRepositoryFixtures {
  readonly testsByStudent?: Readonly<Record<number, readonly TestListItem[]>>
  readonly details?: readonly TestDetail[]
  readonly forbiddenStudentIds?: readonly number[]
  readonly gazeByTestId?: Readonly<Record<number, GazeAnalysisState>>
  readonly failedDetailTestIds?: readonly number[]
  readonly failedGazeTestIds?: readonly number[]
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function assertNotAborted(options?: TestRequestOptions): void {
  options?.signal?.throwIfAborted()
}

function assertStudentId(studentId: number): void {
  if (!Number.isInteger(studentId) || studentId <= 0) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_STUDENT_ID',
      message: 'studentId는 양의 정수여야 합니다.',
    })
  }
}

export class MockTestRepository implements TestRepository {
  private readonly testsByStudent: Readonly<Record<number, readonly TestListItem[]>>
  private readonly details = new Map<number, TestDetail>()
  private readonly forbiddenStudentIds: ReadonlySet<number>
  private readonly gazeByTestId = new Map<number, GazeAnalysisState>()
  private readonly failedDetailTestIds: ReadonlySet<number>
  private readonly failedGazeTestIds: ReadonlySet<number>

  constructor(fixtures: MockTestRepositoryFixtures = {}) {
    this.testsByStudent = clone(fixtures.testsByStudent ?? testListFixtures)
    for (const detail of fixtures.details ?? testDetailFixtures) {
      this.details.set(detail.testId, clone(detail))
    }
    this.forbiddenStudentIds = new Set(fixtures.forbiddenStudentIds ?? [])
    this.failedDetailTestIds = new Set(fixtures.failedDetailTestIds ?? [])
    this.failedGazeTestIds = new Set(fixtures.failedGazeTestIds ?? [])
    for (const [testId, gaze] of Object.entries(fixtures.gazeByTestId ?? testGazeFixtures)) {
      this.gazeByTestId.set(Number(testId), clone(gaze))
    }
  }

  async getTests(studentId: number, options?: TestRequestOptions) {
    this.assertStudentAccess(studentId)
    assertNotAborted(options)
    return clone(
      [...(this.testsByStudent[studentId] ?? [])].sort(
        (left, right) => right.date.localeCompare(left.date) || right.testId - left.testId,
      ),
    )
  }

  async compareTests(
    studentId: number,
    currentTestId: number,
    comparisonTestIds: readonly number[],
    options?: TestRequestOptions,
  ) {
    this.assertStudentAccess(studentId)
    assertTestComparisonSelection(studentId, currentTestId, comparisonTestIds)
    assertNotAborted(options)
    const studentTestIds = new Set(
      (this.testsByStudent[studentId] ?? []).map((test) => test.testId),
    )
    const requestedIds = [currentTestId, ...comparisonTestIds]
    if (requestedIds.some((testId) => !studentTestIds.has(testId))) {
      throw new ApiError({
        status: 404,
        code: 'TEST_NOT_FOUND',
        message: '완료된 검사 기록을 찾을 수 없습니다.',
      })
    }
    if (this.failedDetailTestIds.has(currentTestId)) {
      throw new ApiError({
        status: 500,
        code: 'MOCK_TEST_DETAIL_FAILURE',
        message: '검사 상세를 불러오는 중 일시적인 오류가 발생했습니다.',
      })
    }

    const currentTest = this.details.get(currentTestId)
    const comparisonTests = comparisonTestIds.map((testId) => this.details.get(testId))
    if (!currentTest || comparisonTests.some((detail) => !detail)) {
      throw new ApiError({
        status: 404,
        code: 'TEST_DETAIL_NOT_FOUND',
        message: '검사 상세 결과를 찾을 수 없습니다.',
      })
    }
    return clone({
      currentTest,
      comparisonTests: comparisonTests as TestDetail[],
    })
  }

  async getGazeAnalysis(
    studentId: number,
    testId: number,
    options?: TestRequestOptions,
  ): Promise<GazeAnalysisState> {
    this.assertStudentAccess(studentId)
    assertNotAborted(options)
    const belongsToStudent = (this.testsByStudent[studentId] ?? []).some(
      (test) => test.testId === testId,
    )
    if (!belongsToStudent) {
      throw new ApiError({
        status: 404,
        code: 'TEST_NOT_FOUND',
        message: '완료된 검사 기록을 찾을 수 없습니다.',
      })
    }
    if (this.failedGazeTestIds.has(testId)) {
      throw new ApiError({
        status: 500,
        code: 'MOCK_TEST_GAZE_FAILURE',
        message: '검사 시선 분석을 불러오는 중 일시적인 오류가 발생했습니다.',
      })
    }
    return clone(
      this.gazeByTestId.get(testId) ?? {
        status: 'NO_DATA',
        analysis: null,
      },
    )
  }

  private assertStudentAccess(studentId: number): void {
    assertStudentId(studentId)
    if (this.forbiddenStudentIds.has(studentId)) {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN',
        message: '이 학습자의 검사 기록을 볼 권한이 없습니다.',
      })
    }
  }
}

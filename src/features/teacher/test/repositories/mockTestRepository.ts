import { ApiError } from '@/lib/api'
import { testDetailFixtures, testListFixtures } from '../fixtures'
import type { TestDetail, TestListItem } from '../model'
import {
  assertPositiveId,
  assertTestComparisonSelection,
  type TestRepository,
  type TestRequestOptions,
} from './testRepository'

export interface MockTestRepositoryFixtures {
  readonly testsByStudent?: Readonly<Record<number, readonly TestListItem[]>>
  readonly details?: readonly TestDetail[]
  readonly forbiddenStudentIds?: readonly number[]
  readonly failedDetailTestCurriculumIds?: readonly string[]
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function assertNotAborted(options?: TestRequestOptions): void {
  options?.signal?.throwIfAborted()
}

function compareDecimalIdsDescending(left: string, right: string): number {
  return right.length - left.length || right.localeCompare(left)
}

export class MockTestRepository implements TestRepository {
  private readonly testsByStudent: Readonly<Record<number, readonly TestListItem[]>>
  private readonly details = new Map<string, TestDetail>()
  private readonly forbiddenStudentIds: ReadonlySet<number>
  private readonly failedDetailIds: ReadonlySet<string>

  constructor(fixtures: MockTestRepositoryFixtures = {}) {
    this.testsByStudent = clone(fixtures.testsByStudent ?? testListFixtures)
    for (const detail of fixtures.details ?? testDetailFixtures) {
      this.details.set(detail.testCurriculumId, clone(detail))
    }
    this.forbiddenStudentIds = new Set(fixtures.forbiddenStudentIds ?? [])
    this.failedDetailIds = new Set(fixtures.failedDetailTestCurriculumIds ?? [])
  }

  async getTests(studentId: number, options?: TestRequestOptions) {
    this.assertStudentAccess(studentId)
    assertNotAborted(options)
    return clone(
      [...(this.testsByStudent[studentId] ?? [])].sort(
        (left, right) =>
          (right.completedAt ?? right.createdAt).localeCompare(
            left.completedAt ?? left.createdAt,
          ) ||
          compareDecimalIdsDescending(left.testCurriculumId, right.testCurriculumId),
      ),
    )
  }

  async getTest(
    studentId: number,
    testCurriculumId: string,
    options?: TestRequestOptions,
  ) {
    this.assertStudentAccess(studentId)
    assertPositiveId(testCurriculumId, 'testCurriculumId')
    assertNotAborted(options)
    if (this.failedDetailIds.has(testCurriculumId)) {
      throw new ApiError({
        status: 500,
        code: 'MOCK_TEST_DETAIL_FAILURE',
        message: '검사 상세를 불러오는 중 일시적인 오류가 발생했습니다.',
      })
    }
    const belongsToStudent = (this.testsByStudent[studentId] ?? []).some(
      (item) => item.testCurriculumId === testCurriculumId,
    )
    const result = this.details.get(testCurriculumId)
    if (!belongsToStudent || !result) {
      throw new ApiError({
        status: 404,
        code: 'TEST_CURRICULUM_NOT_FOUND',
        message: '완료된 검사 기록을 찾을 수 없습니다.',
      })
    }
    return clone(result)
  }

  async compareTests(
    studentId: number,
    currentTestCurriculumId: string,
    comparisonTestCurriculumIds: readonly string[],
    options?: TestRequestOptions,
  ) {
    assertTestComparisonSelection(
      studentId,
      currentTestCurriculumId,
      comparisonTestCurriculumIds,
    )
    const [currentTest, ...comparisonTests] = await Promise.all([
      this.getTest(studentId, currentTestCurriculumId, options),
      ...comparisonTestCurriculumIds.map((id) => this.getTest(studentId, id, options)),
    ])
    return { currentTest, comparisonTests }
  }

  private assertStudentAccess(studentId: number): void {
    assertPositiveId(studentId, 'studentId')
    if (this.forbiddenStudentIds.has(studentId)) {
      throw new ApiError({
        status: 403,
        code: 'FORBIDDEN',
        message: '이 학습자의 검사 기록을 볼 권한이 없습니다.',
      })
    }
  }
}

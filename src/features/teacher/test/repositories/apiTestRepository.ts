import { createTestApi, type TestApi } from '../api'
import {
  assertPositiveId,
  assertTestComparisonSelection,
  type TestRepository,
} from './testRepository'

export class ApiTestRepository implements TestRepository {
  constructor(private readonly api: TestApi = createTestApi()) {}

  getTests(studentId: number, options: Parameters<TestRepository['getTests']>[1] = {}) {
    return this.api.getTests(studentId, options)
  }

  compareTests(
    studentId: number,
    currentTestId: number,
    comparisonTestIds: readonly number[],
    options: Parameters<TestRepository['compareTests']>[3] = {},
  ) {
    assertTestComparisonSelection(studentId, currentTestId, comparisonTestIds)
    return this.api.compareTests(studentId, currentTestId, comparisonTestIds, options)
  }

  getGazeAnalysis(
    studentId: number,
    testId: number,
    options: Parameters<TestRepository['getGazeAnalysis']>[2] = {},
  ) {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(testId, 'testId')
    return this.api.getGazeAnalysis(studentId, testId, options)
  }
}

import { createTestApi, type TestApi } from '../api'
import {
  assertPositiveId,
  assertTestComparisonSelection,
  type TestRepository,
} from './testRepository'

export class ApiTestRepository implements TestRepository {
  constructor(private readonly api: TestApi = createTestApi()) {}

  getTests(studentId: number, options: Parameters<TestRepository['getTests']>[1] = {}) {
    assertPositiveId(studentId, 'studentId')
    return this.api.getTests(studentId, options)
  }

  getTest(
    studentId: number,
    testCurriculumId: number,
    options: Parameters<TestRepository['getTest']>[2] = {},
  ) {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(testCurriculumId, 'testCurriculumId')
    return this.api.getTest(studentId, testCurriculumId, options)
  }

  async compareTests(
    studentId: number,
    currentTestCurriculumId: number,
    comparisonTestCurriculumIds: readonly number[],
    options: Parameters<TestRepository['compareTests']>[3] = {},
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
}

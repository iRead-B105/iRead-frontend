import { createTestApi, type TestApi } from '../api'
import { isGazeAnalysisNotFoundError } from '@/features/teacher/gaze'
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
    testCurriculumId: string,
    options: Parameters<TestRepository['getTest']>[2] = {},
  ) {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(testCurriculumId, 'testCurriculumId')
    return this.api.getTest(studentId, testCurriculumId, options)
  }

  async compareTests(
    studentId: number,
    currentTestCurriculumId: string,
    comparisonTestCurriculumIds: readonly string[],
    options: Parameters<TestRepository['compareTests']>[3] = {},
  ) {
    assertTestComparisonSelection(studentId, currentTestCurriculumId, comparisonTestCurriculumIds)
    const [currentTest, ...comparisonTests] = await Promise.all([
      this.getTest(studentId, currentTestCurriculumId, options),
      ...comparisonTestCurriculumIds.map((id) => this.getTest(studentId, id, options)),
    ])
    return { currentTest, comparisonTests }
  }

  async getQuestionGazeAnalysis(
    studentId: number,
    testId: string,
    questionNo: number,
    options: Parameters<TestRepository['getQuestionGazeAnalysis']>[3] = {},
  ) {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(testId, 'testId')
    assertPositiveId(questionNo, 'questionNo')
    try {
      return await this.api.getQuestionGazeAnalysis(studentId, testId, questionNo, options)
    } catch (error) {
      if (isGazeAnalysisNotFoundError(error)) {
        return { status: 'NO_DATA' as const, analysis: null }
      }
      throw error
    }
  }
}

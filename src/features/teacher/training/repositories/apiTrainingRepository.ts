import { apiRequest, downloadFile, isApiError } from '@/lib/api'
import { resolveDemoReferenceDate } from '@/features/teacher/devReferenceDate'
import { isGazeAnalysisNotFoundError } from '@/features/teacher/gaze'
import { createTrainingApi, type TrainingApi } from '../api'
import {
  assertLessonMaterialRequestCount,
  assertLessonMaterialResponseCount,
  normalizeLessonMaterialDocument,
} from '../lessonMaterial'
import {
  assertSaveCurriculumRequest,
  CurriculumSynchronizationError,
  type TrainingRepository,
} from './trainingRepository'

export class ApiTrainingRepository implements TrainingRepository {
  constructor(
    private readonly api: TrainingApi = createTrainingApi(
      apiRequest,
      downloadFile,
      () => new Date(),
      resolveDemoReferenceDate,
    ),
  ) {}

  getCatalog(studentId: number, options: Parameters<TrainingRepository['getCatalog']>[1] = {}) {
    return this.api.getCatalog(studentId, options)
  }

  async getCurrentCurriculum(
    studentId: number,
    options: Parameters<TrainingRepository['getCurrentCurriculum']>[1] = {},
  ) {
    try {
      return await this.api.getCurrentCurriculum(studentId, options)
    } catch (error) {
      if (isApiError(error) && error.status === 404 && error.code === 'NEXT_CURRICULUM_NOT_FOUND') {
        return null
      }
      throw error
    }
  }

  createCurriculum(
    studentId: number,
    request: Parameters<TrainingRepository['createCurriculum']>[1],
  ) {
    assertSaveCurriculumRequest(request)
    return this.api.createCurriculum(studentId, request)
  }

  getCurriculum(
    studentId: number,
    curriculumId: number,
    options: Parameters<TrainingRepository['getCurriculum']>[2] = {},
  ) {
    return this.api.getCurriculum(studentId, curriculumId, options)
  }

  async updateCurriculum(
    studentId: number,
    curriculumId: number,
    request: Parameters<TrainingRepository['updateCurriculum']>[2],
  ) {
    assertSaveCurriculumRequest(request)
    await this.api.updateCurriculum(studentId, curriculumId, request)
    try {
      return await this.getCurriculum(studentId, curriculumId)
    } catch (error) {
      throw new CurriculumSynchronizationError(error)
    }
  }

  completeCurriculumReview(studentId: number, curriculumId: number) {
    return this.api.completeCurriculumReview(studentId, curriculumId)
  }

  generateTraining(studentId: number, trainingId: number) {
    return this.api.generateTraining(studentId, trainingId)
  }

  getTrainingDetail(
    studentId: number,
    trainingId: number,
    options: Parameters<TrainingRepository['getTrainingDetail']>[2] = {},
  ) {
    return this.api.getTrainingDetail(studentId, trainingId, options)
  }

  async getLessonMaterial(
    studentId: number,
    trainingId: number,
    options: Parameters<TrainingRepository['getLessonMaterial']>[2] = {},
  ) {
    const document = await this.api.getLessonMaterial(studentId, trainingId, options)
    return normalizeLessonMaterialDocument(assertLessonMaterialResponseCount(document))
  }

  async saveLessonMaterial(
    studentId: number,
    trainingId: number,
    request: Parameters<TrainingRepository['saveLessonMaterial']>[2],
  ) {
    assertLessonMaterialRequestCount(request)
    const saved = await this.api.saveLessonMaterial(studentId, trainingId, request)
    return assertLessonMaterialResponseCount(saved)
  }

  getCurriculumLogs(
    studentId: number,
    period: Parameters<TrainingRepository['getCurriculumLogs']>[1],
    options: Parameters<TrainingRepository['getCurriculumLogs']>[2] = {},
  ) {
    return this.api.getCurriculumLogs(studentId, period, options)
  }

  getTrainingLog(
    studentId: number,
    curriculumId: number,
    options: Parameters<TrainingRepository['getTrainingLog']>[2] = {},
  ) {
    return this.api.getTrainingLog(studentId, curriculumId, options)
  }

  getStatistics(
    studentId: number,
    curriculumId: number,
    options: Parameters<TrainingRepository['getStatistics']>[2] = {},
  ) {
    return this.api.getStatistics(studentId, curriculumId, options)
  }

  async getGazeAnalysis(
    studentId: number,
    trainingId: number,
    options: Parameters<TrainingRepository['getGazeAnalysis']>[2] = {},
  ) {
    try {
      return await this.api.getGazeAnalysis(studentId, trainingId, options)
    } catch (error) {
      if (isGazeAnalysisNotFoundError(error)) {
        return { status: 'NO_DATA' as const, analysis: null }
      }
      throw error
    }
  }

  exportTraining(
    studentId: number,
    trainingId: number,
    format: Parameters<TrainingRepository['exportTraining']>[2],
  ) {
    return this.api.exportTraining(studentId, trainingId, format)
  }
}

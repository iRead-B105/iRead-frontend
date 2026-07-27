import { isApiError } from '@/lib/api'
import { createTrainingApi, type TrainingApi } from '../api'
import type { TrainingRepository } from './trainingRepository'

export class ApiTrainingRepository implements TrainingRepository {
  constructor(private readonly api: TrainingApi = createTrainingApi()) {}

  getCatalog(
    studentId: number,
    options: Parameters<TrainingRepository['getCatalog']>[1] = {},
  ) {
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
    return this.api.createCurriculum(studentId, request)
  }

  getCurriculum(
    studentId: number,
    curriculumId: number,
    options: Parameters<TrainingRepository['getCurriculum']>[2] = {},
  ) {
    return this.api.getCurriculum(studentId, curriculumId, options)
  }

  updateCurriculum(
    studentId: number,
    curriculumId: number,
    request: Parameters<TrainingRepository['updateCurriculum']>[2],
  ) {
    return this.api.updateCurriculum(studentId, curriculumId, request)
  }

  getExpectedWords(
    studentId: number,
    trainingId: number,
    options: Parameters<TrainingRepository['getExpectedWords']>[2] = {},
  ) {
    return this.api.getExpectedWords(studentId, trainingId, options)
  }

  addExpectedWord(studentId: number, trainingId: number, wordName: string) {
    return this.api.addExpectedWord(studentId, trainingId, wordName)
  }

  deleteExpectedWord(studentId: number, trainingId: number, wordId: number) {
    return this.api.deleteExpectedWord(studentId, trainingId, wordId)
  }

  getTrainingDetail(
    studentId: number,
    trainingId: number,
    options: Parameters<TrainingRepository['getTrainingDetail']>[2] = {},
  ) {
    return this.api.getTrainingDetail(studentId, trainingId, options)
  }
}

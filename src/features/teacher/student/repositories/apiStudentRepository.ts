import { createStudentApi, type StudentApi } from '../api'
import type { StudentRepository } from './studentRepository'

export class ApiStudentRepository implements StudentRepository {
  constructor(private readonly api: StudentApi = createStudentApi()) {}

  list(query = {}, options = {}) {
    return this.api.list(query, options)
  }

  getSummary(options = {}) {
    return this.api.getSummary(options)
  }

  getDetail(studentId: number, options = {}) {
    return this.api.getDetail(studentId, options)
  }

  create(command: Parameters<StudentRepository['create']>[0]) {
    return this.api.create(command)
  }

  update(studentId: number, command: Parameters<StudentRepository['update']>[1]) {
    return this.api.update(studentId, command)
  }

  remove(studentId: number) {
    return this.api.remove(studentId)
  }

  getLearningSummary(studentId: number, options = {}) {
    return this.api.getLearningSummary(studentId, options)
  }

  listLearningEvents(
    studentId: number,
    query: Parameters<StudentRepository['listLearningEvents']>[1] = {},
    options: Parameters<StudentRepository['listLearningEvents']>[2] = {},
  ) {
    return this.api.listLearningEvents(studentId, query, options)
  }

  getLearningEvent(
    studentId: number,
    eventType: Parameters<StudentRepository['getLearningEvent']>[1],
    eventId: number,
    options = {},
  ) {
    return this.api.getLearningEvent(studentId, eventType, eventId, options)
  }

  getAccuracyTrend(studentId: number, options = {}) {
    return this.api.getAccuracyTrend(studentId, options)
  }

  getReadingSpeedTrend(studentId: number, options = {}) {
    return this.api.getReadingSpeedTrend(studentId, options)
  }

  getTrainingHistory(
    studentId: number,
    period: Parameters<StudentRepository['getTrainingHistory']>[1],
    options = {},
  ) {
    return this.api.getTrainingHistory(studentId, period, options)
  }

  updateTeacherMemo(studentId: number, teacherMemo: string | null) {
    return this.api.updateTeacherMemo(studentId, teacherMemo)
  }
}

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

  updateTeacherMemo(studentId: number, teacherMemo: string | null) {
    return this.api.updateTeacherMemo(studentId, teacherMemo)
  }
}

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
}

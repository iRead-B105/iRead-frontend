import { ApiStudentRepository } from './apiStudentRepository'
import type { StudentRepository } from './studentRepository'

export * from './apiStudentRepository'
export * from './studentRepository'

export const studentRepository: StudentRepository = new ApiStudentRepository()

import { dataSource } from '@/config/dataSource'
import type { DataSource } from '@/config/env'
import { ApiStudentRepository } from './apiStudentRepository'
import { MockStudentRepository } from './mockStudentRepository'
import type { StudentRepository } from './studentRepository'

export * from './apiStudentRepository'
export * from './mockStudentRepository'
export * from './studentRepository'

export interface StudentRepositoryOptions {
  readonly api?: StudentRepository
  readonly mock?: StudentRepository
}

export function createStudentRepository(
  source: DataSource,
  options: StudentRepositoryOptions = {},
): StudentRepository {
  switch (source) {
    case 'mock':
      return options.mock ?? new MockStudentRepository()
    case 'api':
      return options.api ?? new ApiStudentRepository()
    default:
      throw new TypeError(`[학습자 데이터 소스] 지원하지 않는 값입니다: ${String(source)}`)
  }
}

export const studentRepository = createStudentRepository(dataSource)

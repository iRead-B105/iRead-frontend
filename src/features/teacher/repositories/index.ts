import { dataSource } from '@/config/dataSource'
import type { DataSource } from '@/config/env'
import { ApiTeacherAdminRepository } from './apiTeacherAdminRepository'
import { MockTeacherAdminRepository } from './mockTeacherAdminRepository'
import type { TeacherAdminRepository } from './teacherAdminRepository'

export * from './apiTeacherAdminRepository'
export * from './mockTeacherAdminRepository'
export * from './teacherAdminRepository'

export interface TeacherAdminRepositoryOptions {
  readonly api?: TeacherAdminRepository
  readonly mock?: TeacherAdminRepository
}

export function createTeacherAdminRepository(
  source: DataSource,
  options: TeacherAdminRepositoryOptions = {},
): TeacherAdminRepository {
  switch (source) {
    case 'mock':
      return options.mock ?? new MockTeacherAdminRepository()
    case 'api':
      return options.api ?? new ApiTeacherAdminRepository()
    default:
      throw new TypeError(`[데이터 소스] 지원하지 않는 값입니다: ${String(source)}`)
  }
}

export const teacherAdminRepository = createTeacherAdminRepository(dataSource)

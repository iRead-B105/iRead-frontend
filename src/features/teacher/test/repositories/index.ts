import { dataSource } from '@/config/dataSource'
import type { DataSource } from '@/config/env'
import { ApiTestRepository } from './apiTestRepository'
import { MockTestRepository } from './mockTestRepository'
import type { TestRepository } from './testRepository'

export * from './apiTestRepository'
export * from './mockTestRepository'
export * from './testRepository'

export interface TestRepositoryOptions {
  readonly api?: TestRepository
  readonly mock?: TestRepository
}

export function createTestRepository(
  source: DataSource,
  options: TestRepositoryOptions = {},
): TestRepository {
  switch (source) {
    case 'mock':
      return options.mock ?? new MockTestRepository()
    case 'api':
      return options.api ?? new ApiTestRepository()
    default:
      throw new TypeError(`[검사 데이터 소스] 지원하지 않는 값입니다: ${String(source)}`)
  }
}

export const testRepository = createTestRepository(dataSource)

import { dataSource } from '@/config/dataSource'
import type { DataSource } from '@/config/env'
import { ApiTrainingRepository } from './apiTrainingRepository'
import { MockTrainingRepository } from './mockTrainingRepository'
import type { TrainingRepository } from './trainingRepository'

export * from './apiTrainingRepository'
export * from './mockTrainingRepository'
export * from './trainingRepository'

export interface TrainingRepositoryOptions {
  readonly api?: TrainingRepository
  readonly mock?: TrainingRepository
}

export function createTrainingRepository(
  source: DataSource,
  options: TrainingRepositoryOptions = {},
): TrainingRepository {
  switch (source) {
    case 'mock':
      return options.mock ?? new MockTrainingRepository()
    case 'api':
      return options.api ?? new ApiTrainingRepository()
    default:
      throw new TypeError(`[훈련 데이터 소스] 지원하지 않는 값입니다: ${String(source)}`)
  }
}

export const trainingRepository = createTrainingRepository(dataSource)

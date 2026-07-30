import { dataSource } from '@/config/dataSource'
import type { DataSource } from '@/config/env'
import { ApiStoryRepository } from './apiStoryRepository'
import { MockStoryRepository } from './mockStoryRepository'
import type { StoryRepository } from './storyRepository'

export * from './apiStoryRepository'
export * from './mockStoryRepository'
export * from './storyRepository'

export interface StoryRepositoryOptions {
  readonly api?: StoryRepository
  readonly mock?: StoryRepository
}

export function createStoryRepository(
  source: DataSource,
  options: StoryRepositoryOptions = {},
): StoryRepository {
  switch (source) {
    case 'mock':
      return options.mock ?? new MockStoryRepository()
    case 'api':
      return options.api ?? new ApiStoryRepository()
    default:
      throw new TypeError(`[이야기 이력 데이터 소스] 지원하지 않는 값입니다: ${String(source)}`)
  }
}

export const storyRepository = createStoryRepository(dataSource)

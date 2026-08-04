import { ApiStoryRepository } from './apiStoryRepository'
import type { StoryRepository } from './storyRepository'

export * from './apiStoryRepository'
export * from './storyRepository'

export const storyRepository: StoryRepository = new ApiStoryRepository()

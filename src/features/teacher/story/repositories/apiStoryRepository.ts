import { createStoryApi, type StoryApi } from '../api'
import type { StoryRepository } from './storyRepository'

export class ApiStoryRepository implements StoryRepository {
  constructor(private readonly api: StoryApi = createStoryApi()) {}

  listHistory(
    studentId: number,
    query: Parameters<StoryRepository['listHistory']>[1] = {},
    options: Parameters<StoryRepository['listHistory']>[2] = {},
  ) {
    return this.api.listHistory(studentId, query, options)
  }
}

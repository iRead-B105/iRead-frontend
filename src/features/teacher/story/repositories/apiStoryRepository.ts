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

  getDetail(
    studentId: number,
    storyId: number,
    options: Parameters<StoryRepository['getDetail']>[2] = {},
  ) {
    return this.api.getDetail(studentId, storyId, options)
  }

  getGazeAnalysis(
    studentId: number,
    storyId: number,
    options: Parameters<StoryRepository['getGazeAnalysis']>[2] = {},
  ) {
    return this.api.getGazeAnalysis(studentId, storyId, options)
  }
}

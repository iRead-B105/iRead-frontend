import type { StoryHistoryList, StoryHistoryQuery } from '../model'

export interface StoryRequestOptions {
  readonly signal?: AbortSignal
}

export interface StoryRepository {
  readonly listHistory: (
    studentId: number,
    query?: StoryHistoryQuery,
    options?: StoryRequestOptions,
  ) => Promise<StoryHistoryList>
}

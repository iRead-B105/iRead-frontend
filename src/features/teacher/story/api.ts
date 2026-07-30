import { apiRequest } from '@/lib/api'
import { mapStoryHistoryList, type StoryHistoryListDto } from './adapters'
import { serializeStoryHistoryQuery } from './query'
import type { StoryHistoryList, StoryHistoryQuery } from './model'
import type { StoryRequestOptions } from './repositories/storyRepository'

export type StoryApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

export interface StoryApi {
  readonly listHistory: (
    studentId: number,
    query?: StoryHistoryQuery,
    options?: StoryRequestOptions,
  ) => Promise<StoryHistoryList>
}

export function createStoryApi(request: StoryApiRequest = apiRequest): StoryApi {
  return {
    async listHistory(studentId, query = {}, options = {}) {
      const search = serializeStoryHistoryQuery(query)
      const result = await request<StoryHistoryListDto>(
        `/api/admin/student/${studentId}/story-history?${search}`,
        { signal: options.signal },
      )
      return mapStoryHistoryList(result)
    },
  }
}

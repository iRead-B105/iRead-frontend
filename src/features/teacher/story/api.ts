import { apiRequest } from '@/lib/api'
import {
  mapStoryDetail,
  mapStoryGazeAnalysis,
  mapStoryHistoryList,
  type StoryDetailDto,
  type StoryGazeAnalysisDto,
  type StoryHistoryListDto,
} from './adapters'
import { serializeStoryHistoryQuery } from './query'
import type {
  StoryDetail,
  StoryGazeAnalysis,
  StoryHistoryList,
  StoryHistoryQuery,
  StoryPageEditInput,
  StoryPageEditResult,
} from './model'
import type { StoryRequestOptions } from './repositories/storyRepository'

export type StoryApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

export interface StoryApi {
  readonly listHistory: (
    studentId: number,
    query?: StoryHistoryQuery,
    options?: StoryRequestOptions,
  ) => Promise<StoryHistoryList>
  readonly getDetail: (
    studentId: number,
    storyId: number,
    options?: StoryRequestOptions,
  ) => Promise<StoryDetail>
  readonly getGazeAnalysis: (
    studentId: number,
    storyId: number,
    options?: StoryRequestOptions,
  ) => Promise<StoryGazeAnalysis>
  readonly updatePage: (
    studentId: number, storyId: number, storyLineId: number, input: StoryPageEditInput,
  ) => Promise<StoryPageEditResult>
  readonly uploadPageImage: (
    studentId: number, storyId: number, storyLineId: number, revision: number, image: File,
  ) => Promise<StoryPageEditResult>
  readonly regeneratePageImage: (
    studentId: number, storyId: number, storyLineId: number, revision: number,
  ) => Promise<StoryPageEditResult>
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
    async getDetail(studentId, storyId, options = {}) {
      const result = await request<StoryDetailDto>(
        `/api/admin/student/${studentId}/story-history/${storyId}`,
        { signal: options.signal },
      )
      return mapStoryDetail(result)
    },
    async getGazeAnalysis(studentId, storyId, options = {}) {
      const result = await request<StoryGazeAnalysisDto>(
        `/api/admin/story/${studentId}/${storyId}/gaze-analysis`,
        { signal: options.signal },
      )
      return mapStoryGazeAnalysis(result)
    },
    async updatePage(studentId, storyId, storyLineId, input) {
      return request<StoryPageEditResult>(
        `/api/admin/student/${studentId}/story-history/${storyId}/pages/${storyLineId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
      )
    },
    async uploadPageImage(studentId, storyId, storyLineId, revision, image) {
      const body = new FormData()
      body.append('revision', String(revision))
      body.append('image', image)
      return request<StoryPageEditResult>(
        `/api/admin/student/${studentId}/story-history/${storyId}/pages/${storyLineId}/image`,
        { method: 'POST', body },
      )
    },
    async regeneratePageImage(studentId, storyId, storyLineId, revision) {
      return request<StoryPageEditResult>(
        `/api/admin/student/${studentId}/story-history/${storyId}/pages/${storyLineId}/image/regenerate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision }),
        },
      )
    },
  }
}

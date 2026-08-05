import type {
  StoryDetail,
  StoryGazeAnalysis,
  StoryHistoryList,
  StoryHistoryQuery,
} from '../model'

export interface StoryRequestOptions {
  readonly signal?: AbortSignal
}

export interface StoryRepository {
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
}

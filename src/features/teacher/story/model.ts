export type StoryStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DELETED'
export type StoryReadingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type StoryGazeAnalysisStatus = 'NOT_COLLECTED' | 'RUNNING' | 'AVAILABLE' | 'FAILED'

export interface StoryTemplateOption {
  readonly storyTemplateId: number
  readonly title: string
  readonly imageUrl: string | null
}

export interface StoryHistoryItem {
  readonly storyId: number
  readonly storyTemplateId: number
  readonly title: string
  readonly imageUrl: string | null
  readonly storyStatus: Exclude<StoryStatus, 'DELETED'>
  readonly generationProgress: number
  readonly createdAt: string
  readonly lastReadAt: string | null
  readonly readingCompletedAt: string | null
  readonly activityAt: string
  readonly readLineCount: number
  readonly totalLineCount: number
  readonly readingProgress: number
  readonly readingStatus: StoryReadingStatus
  readonly gazeAnalysisStatus: StoryGazeAnalysisStatus
}

export interface StoryHistoryQuery {
  readonly from?: string
  readonly to?: string
  readonly storyTemplateId?: number
  readonly page?: number
  readonly size?: number
}

export interface StoryHistoryList {
  readonly storyTemplates: readonly StoryTemplateOption[]
  readonly stories: readonly StoryHistoryItem[]
  readonly page: number
  readonly size: number
  readonly totalElements: number
  readonly totalPages: number
}

export type StoryRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export const DEFAULT_STORY_HISTORY_PAGE_SIZE = 20

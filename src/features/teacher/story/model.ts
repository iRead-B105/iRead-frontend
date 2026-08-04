import type { GazeAnalysisReplay } from '@/features/teacher/gaze'

export type StoryStatus = 'IN_PROGRESS' | 'COMPLETED' | 'DELETED'
export type StoryReadingStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type StoryGazeAnalysisStatus = 'NOT_COLLECTED' | 'RUNNING' | 'AVAILABLE' | 'FAILED'
export type StoryImageGenerationStatus = 'NOT_REQUESTED' | 'PENDING' | 'AVAILABLE' | 'FAILED'

export interface StoryTemplateOption {
  readonly storyTemplateId: number
  readonly title: string
  readonly imageUrl: string | null
}

export interface StoryHistoryItem {
  readonly storyId: number
  readonly storyTemplateId: number
  readonly title: string
  readonly chapterTitle?: string | null
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

export interface StoryBranchRecord {
  readonly choiceId: number
  readonly promptText: string
  readonly transcript: string
  readonly createdAt: string
}

export interface StoryPage {
  readonly pageNo: number
  readonly storyLineId: number
  readonly sceneId: number
  readonly sceneOrder: number
  readonly lineOrder: number
  readonly backgroundImageUrl: string | null
  readonly backgroundImagePosition: string
  readonly imageGenerationStatus: StoryImageGenerationStatus
  readonly textLines: readonly string[]
  readonly requiresBranchInput: boolean
  readonly readAt: string | null
  readonly branchRecord: StoryBranchRecord | null
  readonly revision?: number
  readonly editable?: boolean
  readonly subtitle?: string | null
  readonly choices?: readonly string[]
}

export interface StoryPageEditInput {
  readonly revision: number
  readonly subtitle?: string
  readonly body?: string
  readonly choices?: readonly string[]
}

export interface StoryPageEditResult {
  readonly storyLineId: number
  readonly revision: number
  readonly subtitle: string | null
  readonly body: string
  readonly choices: readonly string[]
  readonly imageUrl: string | null
  readonly editable: boolean
}

export interface StoryDetail {
  readonly story: StoryHistoryItem
  readonly pages: readonly StoryPage[]
  readonly totalPages: number
}

export interface StoryPageGazeRegression {
  readonly fromTokenIndex: number
  readonly toTokenIndex: number
  readonly offsetMs: number
}

export interface StoryPageGazeMetric {
  readonly storyLineId: number
  readonly pageNo: number
  readonly surfaceText: string
  readonly dwellDurationMs: number
  readonly fixationCount: number
  readonly regressionCount: number
  readonly averageFixationTimeMs: number | null
  readonly firstGazeOffsetMs: number
  readonly lastGazeOffsetMs: number
  readonly regressions: readonly StoryPageGazeRegression[]
}

export interface StoryGazeAnalysisMeta {
  readonly contentType: string
  readonly storyId: number
  readonly calculationSource: string
  readonly gazeSessionDurationMs: number
}

export interface StoryGazeAnalysis {
  readonly gazeSessionId: number
  readonly gazeAnalysisId: number
  readonly calibrationStatus: string
  readonly startedAt: string
  readonly endedAt: string
  readonly totalVisitedDurationMs: number
  readonly totalVisitedCount: number
  readonly reverseReadCount: number
  readonly avgVisitedDurationMs: number | null
  readonly pageMetrics: readonly StoryPageGazeMetric[]
  readonly replay?: GazeAnalysisReplay | null
  readonly analysisMeta: StoryGazeAnalysisMeta | null
}

export type StoryRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export const DEFAULT_STORY_HISTORY_PAGE_SIZE = 20

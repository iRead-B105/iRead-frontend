import type {
  StoryGazeAnalysisStatus,
  StoryHistoryItem,
  StoryHistoryList,
  StoryReadingStatus,
  StoryStatus,
  StoryTemplateOption,
} from './model'

export interface StoryTemplateDto {
  readonly storyTemplateId: number
  readonly storyTemplateTitle: string
  readonly storyTemplateImageUrl: string | null
}

export interface StorySummaryDto {
  readonly storyId: number
  readonly storyTemplateId: number
  readonly storyTemplateTitle: string
  readonly storyTemplateImageUrl: string | null
  readonly storyStatus: StoryStatus
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

export interface StoryHistoryListDto {
  readonly storyTemplates: readonly StoryTemplateDto[]
  readonly storyHistory: readonly StorySummaryDto[]
  readonly page: number
  readonly size: number
  readonly totalElements: number
  readonly totalPages: number
}

function nullableUrl(value: string | null): string | null {
  return value?.trim() || null
}

export function mapStoryTemplate(dto: StoryTemplateDto): StoryTemplateOption {
  return {
    storyTemplateId: dto.storyTemplateId,
    title: dto.storyTemplateTitle,
    imageUrl: nullableUrl(dto.storyTemplateImageUrl),
  }
}

export function mapStorySummary(dto: StorySummaryDto): StoryHistoryItem | null {
  if (dto.storyStatus === 'DELETED') return null

  return {
    storyId: dto.storyId,
    storyTemplateId: dto.storyTemplateId,
    title: dto.storyTemplateTitle,
    imageUrl: nullableUrl(dto.storyTemplateImageUrl),
    storyStatus: dto.storyStatus,
    generationProgress: dto.generationProgress,
    createdAt: dto.createdAt,
    lastReadAt: dto.lastReadAt,
    readingCompletedAt: dto.readingCompletedAt,
    activityAt: dto.activityAt,
    readLineCount: dto.readLineCount,
    totalLineCount: dto.totalLineCount,
    readingProgress: dto.readingProgress,
    readingStatus: dto.readingStatus,
    gazeAnalysisStatus: dto.gazeAnalysisStatus,
  }
}

export function mapStoryHistoryList(dto: StoryHistoryListDto): StoryHistoryList {
  return {
    storyTemplates: dto.storyTemplates.map(mapStoryTemplate),
    stories: dto.storyHistory
      .map(mapStorySummary)
      .filter((story): story is StoryHistoryItem => story !== null),
    page: dto.page,
    size: dto.size,
    totalElements: dto.totalElements,
    totalPages: dto.totalPages,
  }
}

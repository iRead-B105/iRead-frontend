import type {
  StoryBranchRecord,
  StoryDetail,
  StoryGazeAnalysisStatus,
  StoryGazeAnalysis,
  StoryGazeAnalysisMeta,
  StoryHistoryItem,
  StoryHistoryList,
  StoryImageGenerationStatus,
  StoryPage,
  StoryPageGazeMetric,
  StoryPageGazeRegression,
  StoryReadingStatus,
  StoryStatus,
  StoryTemplateOption,
} from './model'
import { mapRawGazeAnalysis } from '@/features/teacher/gaze'

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

export interface StoryBranchRecordDto {
  readonly choiceId: number
  readonly promptText: string
  readonly transcript: string
  readonly createdAt: string
}

export interface StoryPageDto {
  readonly pageNo: number
  readonly storyLineId: number
  readonly sceneId: number
  readonly sceneOrder: number
  readonly lineOrder: number
  readonly backgroundImageUrl: string | null
  readonly backgroundImagePosition: string | null
  readonly imageGenerationStatus: StoryImageGenerationStatus
  readonly textLines: readonly unknown[] | null
  readonly requiresBranchInput: boolean
  readonly readAt: string | null
  readonly branchRecord: StoryBranchRecordDto | null
}

export interface StoryDetailDto {
  readonly story: StorySummaryDto
  readonly pages: readonly StoryPageDto[] | null
  readonly totalPages: number
}

export interface StoryPageGazeRegressionDto {
  readonly fromTokenIndex: number
  readonly toTokenIndex: number
  readonly offsetMs: number
}

export interface StoryPageGazeMetricDto {
  readonly storyLineId: number
  readonly pageNo: number
  readonly surfaceText: string
  readonly dwellDurationMs: number
  readonly fixationCount: number
  readonly regressionCount: number
  readonly averageFixationTimeMs: number | null
  readonly firstGazeOffsetMs: number
  readonly lastGazeOffsetMs: number
  readonly regressions: readonly StoryPageGazeRegressionDto[] | null
}

export interface StoryGazeAnalysisMetaDto {
  readonly contentType: string
  readonly storyId: number
  readonly calculationSource: string
  readonly gazeSessionDurationMs: number
}

export interface StoryGazeAnalysisDto {
  readonly gazeSessionId: number
  readonly gazeAnalysisId: number
  readonly calibrationStatus: string
  readonly startedAt: string
  readonly endedAt: string
  readonly totalDwellTime: number
  readonly dwellCount: number
  readonly regressionCount: number
  readonly averageFixationTime: number | null
  readonly pageMetrics: readonly StoryPageGazeMetricDto[] | null
  readonly analysisMeta: StoryGazeAnalysisMetaDto | null
}

function nullableUrl(value: string | null): string | null {
  return value?.trim() || null
}

function textFromRecord(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const text = (value as Record<string, unknown>).text
  return typeof text === 'string' ? text.trim() || null : null
}

function normalizeStoryTextLine(value: unknown): string | null {
  const recordText = textFromRecord(value)
  if (recordText) return recordText
  if (typeof value !== 'string') return null

  const text = value.trim()
  if (!text) return null
  if (text.startsWith('{') && text.endsWith('}')) {
    try {
      return textFromRecord(JSON.parse(text)) ?? text
    } catch {
      return text
    }
  }
  return text
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

function mapStoryBranchRecord(dto: StoryBranchRecordDto): StoryBranchRecord {
  return { ...dto }
}

function mapStoryPage(dto: StoryPageDto): StoryPage {
  const backgroundImageUrl = nullableUrl(dto.backgroundImageUrl)
  const validImage =
    (dto.imageGenerationStatus === 'AVAILABLE' && backgroundImageUrl !== null) ||
    (dto.imageGenerationStatus !== 'AVAILABLE' && backgroundImageUrl === null)
  if (!validImage) {
    throw new TypeError(
      `[이야기 상세 API] ${dto.pageNo}페이지의 이미지 상태와 URL 조합이 올바르지 않습니다.`,
    )
  }

  return {
    pageNo: dto.pageNo,
    storyLineId: dto.storyLineId,
    sceneId: dto.sceneId,
    sceneOrder: dto.sceneOrder,
    lineOrder: dto.lineOrder,
    backgroundImageUrl,
    backgroundImagePosition: dto.backgroundImagePosition?.trim() || 'center',
    imageGenerationStatus: dto.imageGenerationStatus,
    textLines: (dto.textLines ?? [])
      .map(normalizeStoryTextLine)
      .filter((line): line is string => line !== null),
    requiresBranchInput: dto.requiresBranchInput,
    readAt: dto.readAt,
    branchRecord: dto.branchRecord === null ? null : mapStoryBranchRecord(dto.branchRecord),
  }
}

export function mapStoryDetail(dto: StoryDetailDto): StoryDetail {
  const story = mapStorySummary(dto.story)
  if (story === null) {
    throw new TypeError('[이야기 상세 API] 삭제된 이야기는 상세 응답에 포함할 수 없습니다.')
  }

  const pages = [...(dto.pages ?? [])]
    .sort(
      (left, right) =>
        left.pageNo - right.pageNo ||
        left.sceneOrder - right.sceneOrder ||
        left.lineOrder - right.lineOrder ||
        left.storyLineId - right.storyLineId,
    )
    .map(mapStoryPage)

  if (dto.totalPages !== pages.length) {
    throw new TypeError('[이야기 상세 API] 전체 페이지 수가 페이지 목록과 일치하지 않습니다.')
  }
  pages.forEach((page, index) => {
    if (page.pageNo !== index + 1) {
      throw new TypeError('[이야기 상세 API] 페이지 번호가 1부터 연속적이지 않습니다.')
    }
  })
  if (new Set(pages.map((page) => page.storyLineId)).size !== pages.length) {
    throw new TypeError('[이야기 상세 API] 한 문장이 여러 페이지에 중복되었습니다.')
  }

  return {
    story,
    pages,
    totalPages: dto.totalPages,
  }
}

function mapPageRegression(dto: StoryPageGazeRegressionDto): StoryPageGazeRegression {
  return { ...dto }
}

function mapPageMetric(dto: StoryPageGazeMetricDto): StoryPageGazeMetric {
  return {
    ...dto,
    regressions: (dto.regressions ?? []).map(mapPageRegression),
  }
}

function mapAnalysisMeta(dto: StoryGazeAnalysisMetaDto): StoryGazeAnalysisMeta {
  return { ...dto }
}

export function mapStoryGazeAnalysis(dto: StoryGazeAnalysisDto): StoryGazeAnalysis {
  const aggregate = mapRawGazeAnalysis(dto)
  if (aggregate.status !== 'AVAILABLE') {
    throw new TypeError('[이야기 시선 분석 API] 집계 결과를 변환하지 못했습니다.')
  }

  return {
    gazeSessionId: dto.gazeSessionId,
    gazeAnalysisId: dto.gazeAnalysisId,
    calibrationStatus: dto.calibrationStatus,
    startedAt: dto.startedAt,
    endedAt: dto.endedAt,
    totalVisitedDurationMs: aggregate.analysis.totalVisitedDurationMs,
    totalVisitedCount: aggregate.analysis.totalVisitedCount,
    reverseReadCount: aggregate.analysis.reverseReadCount,
    avgVisitedDurationMs: aggregate.analysis.avgVisitedDurationMs,
    pageMetrics: [...(dto.pageMetrics ?? [])]
      .sort((left, right) => left.pageNo - right.pageNo)
      .map(mapPageMetric),
    analysisMeta: dto.analysisMeta === null ? null : mapAnalysisMeta(dto.analysisMeta),
  }
}

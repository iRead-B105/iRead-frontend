import type {
  StoryBranch,
  StoryDetail,
  StoryGazeAnalysisStatus,
  StoryGazeAnalysis,
  StoryGazeAnalysisMeta,
  StoryGazeRegression,
  StoryHistoryItem,
  StoryHistoryList,
  StoryImageGenerationStatus,
  StoryLine,
  StoryReadingStatus,
  StoryScene,
  StorySentenceGazeMetric,
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

export interface StoryLineDto {
  readonly lineId: number
  readonly lineOrder: number
  readonly lineText: string
  readonly requiresBranchInput: boolean
  readonly readAt: string | null
}

export interface StorySceneDto {
  readonly sceneId: number
  readonly sequenceNo: number
  readonly imageUrl: string | null
  readonly imageGenerationStatus: StoryImageGenerationStatus
  readonly lines: readonly StoryLineDto[]
}

export interface StoryBranchDto {
  readonly choiceId: number
  readonly branchLineId: number
  readonly promptText: string
  readonly transcript: string
  readonly createdAt: string
}

export interface StoryDetailDto {
  readonly story: StorySummaryDto
  readonly scenes: readonly StorySceneDto[]
  readonly branches: readonly StoryBranchDto[]
}

export interface StorySentenceGazeMetricDto {
  readonly storyLineId: number
  readonly sequenceNo: number
  readonly surfaceText: string
  readonly dwellDurationMs: number
  readonly fixationCount: number
  readonly firstGazeOffsetMs: number
  readonly lastGazeOffsetMs: number
}

export interface StoryGazeRegressionDto {
  readonly fromTargetIndex: number
  readonly fromTokenIndex: number
  readonly toTargetIndex: number
  readonly toTokenIndex: number
  readonly offsetMs: number
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
  readonly sentenceMetrics: readonly StorySentenceGazeMetricDto[] | null
  readonly regressions: readonly StoryGazeRegressionDto[] | null
  readonly analysisMeta: StoryGazeAnalysisMetaDto | null
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

function mapStoryLine(dto: StoryLineDto): StoryLine {
  return { ...dto }
}

function mapStoryScene(dto: StorySceneDto): StoryScene {
  const imageUrl = nullableUrl(dto.imageUrl)
  const validImage =
    (dto.imageGenerationStatus === 'AVAILABLE' && imageUrl !== null) ||
    (dto.imageGenerationStatus !== 'AVAILABLE' && imageUrl === null)
  if (!validImage) {
    throw new TypeError(
      `[이야기 상세 API] 장면 ${dto.sceneId}의 이미지 상태와 URL 조합이 올바르지 않습니다.`,
    )
  }

  return {
    sceneId: dto.sceneId,
    sequenceNo: dto.sequenceNo,
    imageUrl,
    imageGenerationStatus: dto.imageGenerationStatus,
    lines: [...dto.lines].sort((left, right) => left.lineOrder - right.lineOrder).map(mapStoryLine),
  }
}

function mapStoryBranch(dto: StoryBranchDto): StoryBranch {
  return { ...dto }
}

export function mapStoryDetail(dto: StoryDetailDto): StoryDetail {
  const story = mapStorySummary(dto.story)
  if (story === null) {
    throw new TypeError('[이야기 상세 API] 삭제된 이야기는 상세 응답에 포함할 수 없습니다.')
  }
  return {
    story,
    scenes: [...dto.scenes]
      .sort((left, right) => left.sequenceNo - right.sequenceNo)
      .map(mapStoryScene),
    branches: dto.branches.map(mapStoryBranch),
  }
}

function mapSentenceMetric(dto: StorySentenceGazeMetricDto): StorySentenceGazeMetric {
  return { ...dto }
}

function mapRegression(dto: StoryGazeRegressionDto): StoryGazeRegression {
  return { ...dto }
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
    sentenceMetrics: [...(dto.sentenceMetrics ?? [])]
      .sort((left, right) => left.sequenceNo - right.sequenceNo)
      .map(mapSentenceMetric),
    regressions: (dto.regressions ?? []).map(mapRegression),
    analysisMeta: dto.analysisMeta === null ? null : mapAnalysisMeta(dto.analysisMeta),
  }
}

import { apiRequest, jsonBody } from '@/lib/api'
import type {
  CreateReportInput,
  CreateReportResult,
  RefreshReportGazeResult,
  ReportDetail,
  ReportGazePoint,
  ReportGazeSeries,
  ReportGazeTrend,
  ReportListItem,
  ReportSnapshot,
  UpdateReportMemoResult,
} from './model'
import type { ReportRequestOptions } from './repositories/reportRepository'

export type ReportApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

interface ReportListItemDto {
  readonly reportId: number
  readonly studentId: number
  readonly startDate: string
  readonly endDate: string
  readonly createdAt: string
}

type ReportGazePointDto = ReportGazePoint
type ReportGazeSeriesDto = ReportGazeSeries
type ReportGazeTrendDto = ReportGazeTrend
interface ReportSnapshotDto extends Omit<ReportSnapshot, 'gazeTrend'> {
  /**
   * Reports saved before gaze-trend aggregation can contain only the legacy
   * single gazeAnalysis, so the new field remains nullable on reads.
   */
  readonly gazeTrend?: ReportGazeTrendDto | null
  readonly gazeAnalysis?: unknown | null
}

interface ReportDetailDto extends ReportListItemDto {
  readonly snapshot: ReportSnapshotDto
  readonly teacherMemo: string | null
}

interface CreateReportResultDto {
  readonly reportId: number
  readonly createdAt: string
}

interface UpdateReportMemoResultDto {
  readonly reportId: number
  readonly teacherMemo: string | null
  readonly createdAt: string
}

interface RefreshReportGazeResultDto {
  readonly reportId: number
}

function requestInit(options?: ReportRequestOptions): RequestInit {
  return options?.signal ? { signal: options.signal } : {}
}

function mapGazePoint(dto: ReportGazePointDto): ReportGazePoint {
  return { ...dto }
}

function mapGazeSeries(dto: ReportGazeSeriesDto): ReportGazeSeries {
  return {
    ...dto,
    points: [...dto.points]
      .sort(
        (left, right) =>
          left.analyzedAt.localeCompare(right.analyzedAt) ||
          left.gazeAnalysisResultId - right.gazeAnalysisResultId,
      )
      .map(mapGazePoint),
    changes: dto.changes
      ? {
          totalVisitedDurationMs: { ...dto.changes.totalVisitedDurationMs },
          totalVisitedCount: { ...dto.changes.totalVisitedCount },
          reverseReadCount: { ...dto.changes.reverseReadCount },
          avgVisitedDurationMs: { ...dto.changes.avgVisitedDurationMs },
        }
      : null,
    descriptions: [...dto.descriptions],
  }
}

function mapGazeTrend(dto: ReportGazeTrendDto): ReportGazeTrend {
  return {
    generatedAt: dto.generatedAt,
    training: mapGazeSeries(dto.training),
    test: mapGazeSeries(dto.test),
  }
}

function emptyGazeSeries(): ReportGazeSeries {
  return {
    status: 'NO_DATA',
    comparisonAvailable: false,
    points: [],
    changes: null,
    descriptions: [],
    failedSessionCount: 0,
  }
}

function mapSnapshot(dto: ReportSnapshotDto, generatedAt: string): ReportSnapshot {
  const {
    gazeAnalysis: _gazeAnalysis,
    gazeTrend,
    ...snapshot
  } = dto

  return {
    ...snapshot,
    growthHistory: [...dto.growthHistory]
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((point) => ({ ...point })),
    areaAchievements: dto.areaAchievements.map((item) => ({ ...item })),
    frequentlyIncorrectWords: dto.frequentlyIncorrectWords.map((word) => ({ ...word })),
    improvedPatterns: [...dto.improvedPatterns],
    persistentDifficultyPatterns: [...dto.persistentDifficultyPatterns],
    gazeTrend: gazeTrend
      ? mapGazeTrend(gazeTrend)
      : {
          generatedAt,
          training: emptyGazeSeries(),
          test: emptyGazeSeries(),
        },
  }
}

function mapListItem(dto: ReportListItemDto): ReportListItem {
  return { ...dto }
}

function mapReportDetail(dto: ReportDetailDto): ReportDetail {
  return {
    ...mapListItem(dto),
    snapshot: mapSnapshot(dto.snapshot, dto.createdAt),
    teacherMemo: dto.teacherMemo,
  }
}

export interface ReportApi {
  readonly listByStudent: (
    studentId: number,
    options?: ReportRequestOptions,
  ) => Promise<readonly ReportListItem[]>
  readonly create: (input: CreateReportInput) => Promise<CreateReportResult>
  readonly get: (
    reportId: number,
    options?: ReportRequestOptions,
  ) => Promise<ReportDetail>
  readonly updateTeacherMemo: (
    reportId: number,
    teacherMemo: string | null,
  ) => Promise<UpdateReportMemoResult>
  readonly refreshGazeTrend: (reportId: number) => Promise<RefreshReportGazeResult>
}

export function createReportApi(request: ReportApiRequest = apiRequest): ReportApi {
  return {
    async listByStudent(studentId, options) {
      const query = new URLSearchParams({ studentId: String(studentId) })
      const dto = await request<readonly ReportListItemDto[]>(
        `/api/admin/report?${query.toString()}`,
        requestInit(options),
      )
      return [...dto]
        .sort(
          (left, right) =>
            right.createdAt.localeCompare(left.createdAt) ||
            right.reportId - left.reportId,
        )
        .map(mapListItem)
    },
    async create(input) {
      const dto = await request<CreateReportResultDto>('/api/admin/report', {
        method: 'POST',
        body: jsonBody(input),
      })
      return { ...dto }
    },
    async get(reportId, options) {
      const dto = await request<ReportDetailDto>(
        `/api/admin/report/${reportId}`,
        requestInit(options),
      )
      return mapReportDetail(dto)
    },
    async updateTeacherMemo(reportId, teacherMemo) {
      const dto = await request<UpdateReportMemoResultDto>(
        `/api/admin/report/${reportId}/teacher-memo`,
        {
          method: 'PATCH',
          body: jsonBody({ teacherMemo }),
        },
      )
      return { ...dto }
    },
    async refreshGazeTrend(reportId) {
      const dto = await request<RefreshReportGazeResultDto>(
        `/api/admin/report/${reportId}/gaze-analysis`,
        { method: 'POST' },
      )
      return { ...dto }
    },
  }
}

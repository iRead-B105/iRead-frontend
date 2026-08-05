import type {
  CreateReportInput,
  CreateReportResult,
  RefreshReportGazeResult,
  ReportDetail,
  ReportListItem,
  UpdateReportMemoResult,
} from '../model'

export interface ReportRequestOptions {
  readonly signal?: AbortSignal
}

export interface ReportRepository {
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

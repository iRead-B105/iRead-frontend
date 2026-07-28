import { ApiError } from '@/lib/api'
import { createReportApi, type ReportApi } from '../api'
import type { ReportRepository } from './reportRepository'

export interface ApiReportRepositoryOptions {
  /**
   * [BLOCKED] GET /api/admin/report is implemented by Backend but is not in
   * Admin OpenAPI yet. Keep the default false until the target contract lands.
   */
  readonly listContractAvailable?: boolean
}

export class ApiReportRepository implements ReportRepository {
  private readonly listContractAvailable: boolean

  constructor(
    private readonly api: ReportApi = createReportApi(),
    options: ApiReportRepositoryOptions = {},
  ) {
    this.listContractAvailable = options.listContractAvailable ?? false
  }

  async listByStudent(
    studentId: number,
    options: Parameters<ReportRepository['listByStudent']>[1] = {},
  ) {
    if (!this.listContractAvailable) {
      throw new ApiError({
        status: 0,
        code: 'REPORT_LIST_CONTRACT_BLOCKED',
        message: '보고서 목록 API 계약이 아직 확정되지 않았습니다.',
      })
    }
    return this.api.listByStudent(studentId, options)
  }

  create(input: Parameters<ReportRepository['create']>[0]) {
    return this.api.create(input)
  }

  get(
    reportId: number,
    options: Parameters<ReportRepository['get']>[1] = {},
  ) {
    return this.api.get(reportId, options)
  }

  updateTeacherMemo(
    reportId: number,
    teacherMemo: Parameters<ReportRepository['updateTeacherMemo']>[1],
  ) {
    return this.api.updateTeacherMemo(reportId, teacherMemo)
  }

  refreshGazeTrend(reportId: number) {
    return this.api.refreshGazeTrend(reportId)
  }
}

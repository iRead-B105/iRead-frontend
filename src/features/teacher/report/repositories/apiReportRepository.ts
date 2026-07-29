import { createReportApi, type ReportApi } from '../api'
import type { ReportRepository } from './reportRepository'

export class ApiReportRepository implements ReportRepository {
  constructor(private readonly api: ReportApi = createReportApi()) {}

  async listByStudent(
    studentId: number,
    options: Parameters<ReportRepository['listByStudent']>[1] = {},
  ) {
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

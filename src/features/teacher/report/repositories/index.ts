import { ApiReportRepository } from './apiReportRepository'
import type { ReportRepository } from './reportRepository'

export * from './apiReportRepository'
export * from './reportRepository'

export const reportRepository: ReportRepository = new ApiReportRepository()

import { dataSource } from '@/config/dataSource'
import type { DataSource } from '@/config/env'
import { ApiReportRepository } from './apiReportRepository'
import { MockReportRepository } from './mockReportRepository'
import type { ReportRepository } from './reportRepository'

export * from './apiReportRepository'
export * from './mockReportRepository'
export * from './reportRepository'

export interface ReportRepositoryOptions {
  readonly api?: ReportRepository
  readonly mock?: ReportRepository
}

export function createReportRepository(
  source: DataSource,
  options: ReportRepositoryOptions = {},
): ReportRepository {
  switch (source) {
    case 'mock':
      return options.mock ?? new MockReportRepository()
    case 'api':
      return options.api ?? new ApiReportRepository()
    default:
      throw new TypeError(`[보고서 데이터 소스] 지원하지 않는 값입니다: ${String(source)}`)
  }
}

export const reportRepository = createReportRepository(dataSource)

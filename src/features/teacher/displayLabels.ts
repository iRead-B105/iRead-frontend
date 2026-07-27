import type { ReportStatus } from './types'

export const reportStatusLabels = {
  draft: '초안',
  published: '발행됨',
} satisfies Record<ReportStatus, string>

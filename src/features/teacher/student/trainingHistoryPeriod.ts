import { resolveHistoryDateRange } from '@/features/teacher/periodDateRange'
import type { StudentTrainingHistoryPeriod } from './model'

export function resolveTrainingHistoryDateRange(
  period: StudentTrainingHistoryPeriod,
  today: Date = new Date(),
): ReturnType<typeof resolveHistoryDateRange> {
  return resolveHistoryDateRange(period, today)
}

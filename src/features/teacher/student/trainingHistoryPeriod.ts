import { resolveHistoryDateRange } from '@/features/teacher/periodDateRange'
import type { StudentTrainingHistoryQuery } from './model'

export function resolveTrainingHistoryDateRange(
  query: StudentTrainingHistoryQuery,
  today: Date = new Date(),
): ReturnType<typeof resolveHistoryDateRange> {
  return typeof query === 'string' ? resolveHistoryDateRange(query, today) : query
}

export function trainingHistoryQueryKey(query: StudentTrainingHistoryQuery): string {
  return typeof query === 'string' ? query : `${query.from}:${query.to}`
}

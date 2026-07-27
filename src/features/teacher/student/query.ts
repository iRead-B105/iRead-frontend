import {
  DEFAULT_STUDENT_PAGE_SIZE,
  type StudentListQuery,
} from './model'

export interface NormalizedStudentListQuery {
  readonly keyword?: string
  readonly age?: number
  readonly recentDays?: 7 | 30
  readonly page: number
  readonly size: number
}

export function normalizeStudentListQuery(
  query: StudentListQuery = {},
): NormalizedStudentListQuery {
  const keyword = query.keyword?.trim()
  const page = query.page ?? 0
  const size = query.size ?? DEFAULT_STUDENT_PAGE_SIZE

  if (!Number.isInteger(page) || page < 0) {
    throw new TypeError('[학습자 목록] page는 0 이상의 정수여야 합니다.')
  }
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new TypeError('[학습자 목록] size는 1 이상 100 이하의 정수여야 합니다.')
  }
  if (
    query.age !== undefined &&
    (!Number.isInteger(query.age) || query.age < 6 || query.age > 12)
  ) {
    throw new TypeError('[학습자 목록] age는 6 이상 12 이하의 정수여야 합니다.')
  }
  if (query.recentDays !== undefined && ![7, 30].includes(query.recentDays)) {
    throw new TypeError('[학습자 목록] recentDays는 7 또는 30이어야 합니다.')
  }

  return {
    ...(keyword ? { keyword } : {}),
    ...(query.age !== undefined ? { age: query.age } : {}),
    ...(query.recentDays !== undefined ? { recentDays: query.recentDays } : {}),
    page,
    size,
  }
}

export function serializeStudentListQuery(query: StudentListQuery = {}): string {
  const normalized = normalizeStudentListQuery(query)
  const params = new URLSearchParams()

  if (normalized.keyword) params.set('keyword', normalized.keyword)
  if (normalized.age !== undefined) params.set('age', String(normalized.age))
  if (normalized.recentDays !== undefined) {
    params.set('recentDays', String(normalized.recentDays))
  }
  params.set('page', String(normalized.page))
  params.set('size', String(normalized.size))

  return params.toString()
}

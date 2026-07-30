import { DEFAULT_STORY_HISTORY_PAGE_SIZE, type StoryHistoryQuery } from './model'

export interface NormalizedStoryHistoryQuery {
  readonly from?: string
  readonly to?: string
  readonly storyTemplateId?: number
  readonly page: number
  readonly size: number
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function assertDate(value: string | undefined, fieldName: 'from' | 'to'): void {
  if (value === undefined) return
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    throw new TypeError(`[이야기 이력] ${fieldName}은 YYYY-MM-DD 형식이어야 합니다.`)
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    throw new TypeError(`[이야기 이력] ${fieldName}은 실제 존재하는 날짜여야 합니다.`)
  }
}

export function normalizeStoryHistoryQuery(
  query: StoryHistoryQuery = {},
): NormalizedStoryHistoryQuery {
  const from = query.from?.trim() || undefined
  const to = query.to?.trim() || undefined
  const page = query.page ?? 0
  const size = query.size ?? DEFAULT_STORY_HISTORY_PAGE_SIZE

  assertDate(from, 'from')
  assertDate(to, 'to')
  if (from && to && from > to) {
    throw new TypeError('[이야기 이력] 시작일은 종료일보다 늦을 수 없습니다.')
  }
  if (
    query.storyTemplateId !== undefined &&
    (!Number.isInteger(query.storyTemplateId) || query.storyTemplateId <= 0)
  ) {
    throw new TypeError('[이야기 이력] storyTemplateId는 양의 정수여야 합니다.')
  }
  if (!Number.isInteger(page) || page < 0) {
    throw new TypeError('[이야기 이력] page는 0 이상의 정수여야 합니다.')
  }
  if (!Number.isInteger(size) || size < 1 || size > 100) {
    throw new TypeError('[이야기 이력] size는 1 이상 100 이하의 정수여야 합니다.')
  }

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(query.storyTemplateId !== undefined
      ? { storyTemplateId: query.storyTemplateId }
      : {}),
    page,
    size,
  }
}

export function serializeStoryHistoryQuery(query: StoryHistoryQuery = {}): string {
  const normalized = normalizeStoryHistoryQuery(query)
  const search = new URLSearchParams()

  if (normalized.from) search.set('from', normalized.from)
  if (normalized.to) search.set('to', normalized.to)
  if (normalized.storyTemplateId !== undefined) {
    search.set('storyTemplateId', String(normalized.storyTemplateId))
  }
  search.set('page', String(normalized.page))
  search.set('size', String(normalized.size))

  return search.toString()
}

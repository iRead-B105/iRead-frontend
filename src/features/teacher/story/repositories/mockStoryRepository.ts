import { ApiError } from '@/lib/api'
import { mapStoryHistoryList } from '../adapters'
import {
  storyHistoryFixturesByStudent,
  storyTemplateFixtures,
} from '../fixtures'
import { normalizeStoryHistoryQuery } from '../query'
import type { StoryRepository, StoryRequestOptions } from './storyRepository'

function activityDate(activityAt: string): string {
  return activityAt.slice(0, 10)
}

function wait(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (delayMs <= 0) {
    signal?.throwIfAborted()
    return Promise.resolve()
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, delayMs)
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

export interface MockStoryRepositoryOptions {
  readonly delayMs?: number
  readonly historiesByStudent?: Readonly<
    Record<number, (typeof storyHistoryFixturesByStudent)[number]>
  >
  readonly knownStudentIds?: readonly number[]
}

export class MockStoryRepository implements StoryRepository {
  private readonly delayMs: number
  private readonly historiesByStudent: typeof storyHistoryFixturesByStudent
  private readonly knownStudentIds: ReadonlySet<number>

  constructor(options: MockStoryRepositoryOptions = {}) {
    this.delayMs = options.delayMs ?? 80
    this.historiesByStudent = options.historiesByStudent ?? storyHistoryFixturesByStudent
    this.knownStudentIds = new Set(options.knownStudentIds ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  }

  async listHistory(studentId: number, query = {}, options: StoryRequestOptions = {}) {
    await wait(this.delayMs, options.signal)
    options.signal?.throwIfAborted()

    if (!this.knownStudentIds.has(studentId)) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 학습자를 찾을 수 없습니다.',
      })
    }

    const normalized = normalizeStoryHistoryQuery(query)
    const filtered = [...(this.historiesByStudent[studentId] ?? [])]
      .filter((story) => story.storyStatus !== 'DELETED')
      .filter(
        (story) =>
          normalized.storyTemplateId === undefined ||
          story.storyTemplateId === normalized.storyTemplateId,
      )
      .filter((story) => normalized.from === undefined || activityDate(story.activityAt) >= normalized.from)
      .filter((story) => normalized.to === undefined || activityDate(story.activityAt) <= normalized.to)
      .sort((left, right) => right.activityAt.localeCompare(left.activityAt))

    const start = normalized.page * normalized.size
    const pageItems = filtered.slice(start, start + normalized.size)

    return mapStoryHistoryList({
      storyTemplates: storyTemplateFixtures,
      storyHistory: pageItems,
      page: normalized.page,
      size: normalized.size,
      totalElements: filtered.length,
      totalPages: filtered.length === 0 ? 0 : Math.ceil(filtered.length / normalized.size),
    })
  }
}

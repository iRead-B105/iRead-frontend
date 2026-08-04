import { ApiError } from '@/lib/api'
import {
  mapStoryDetail,
  mapStoryGazeAnalysis,
  mapStoryHistoryList,
} from '@/features/teacher/story/adapters'
import {
  storyDetailFixturesById,
  storyGazeFixturesByStoryId,
  storyHistoryFixturesByStudent,
  storyTemplateFixtures,
} from '@/test/fixtures/story'
import { normalizeStoryHistoryQuery } from '@/features/teacher/story/query'
import type {
  StoryRepository,
  StoryRequestOptions,
} from '@/features/teacher/story/repositories/storyRepository'

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

export interface TestStoryRepositoryOptions {
  readonly delayMs?: number
  readonly historiesByStudent?: Readonly<
    Record<number, (typeof storyHistoryFixturesByStudent)[number]>
  >
  readonly knownStudentIds?: readonly number[]
  readonly detailByStoryId?: typeof storyDetailFixturesById
  readonly gazeByStoryId?: typeof storyGazeFixturesByStoryId
}

export class TestStoryRepository implements StoryRepository {
  private readonly delayMs: number
  private readonly historiesByStudent: typeof storyHistoryFixturesByStudent
  private readonly knownStudentIds: ReadonlySet<number>
  private readonly detailByStoryId: typeof storyDetailFixturesById
  private readonly gazeByStoryId: typeof storyGazeFixturesByStoryId

  constructor(options: TestStoryRepositoryOptions = {}) {
    this.delayMs = options.delayMs ?? 80
    this.historiesByStudent = options.historiesByStudent ?? storyHistoryFixturesByStudent
    this.knownStudentIds = new Set(options.knownStudentIds ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    this.detailByStoryId = options.detailByStoryId ?? storyDetailFixturesById
    this.gazeByStoryId = options.gazeByStoryId ?? storyGazeFixturesByStoryId
  }

  private assertOwnedStory(studentId: number, storyId: number): void {
    const owned = (this.historiesByStudent[studentId] ?? []).some(
      (story) => story.storyId === storyId && story.storyStatus !== 'DELETED',
    )
    if (!owned) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 이야기 이력을 찾을 수 없습니다.',
      })
    }
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

  async getDetail(studentId: number, storyId: number, options: StoryRequestOptions = {}) {
    await wait(this.delayMs, options.signal)
    options.signal?.throwIfAborted()
    this.assertOwnedStory(studentId, storyId)
    const detail = this.detailByStoryId[storyId]
    if (!detail) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 이야기 상세를 찾을 수 없습니다.',
      })
    }
    return mapStoryDetail(detail)
  }

  async getGazeAnalysis(studentId: number, storyId: number, options: StoryRequestOptions = {}) {
    await wait(this.delayMs, options.signal)
    options.signal?.throwIfAborted()
    this.assertOwnedStory(studentId, storyId)
    const gaze = this.gazeByStoryId[storyId]
    if (!gaze) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 이야기 시선 분석을 찾을 수 없습니다.',
      })
    }
    return mapStoryGazeAnalysis(gaze)
  }
}

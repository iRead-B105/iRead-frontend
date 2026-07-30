import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoryHistoryList, StoryRepository } from '@/features/teacher/story'
import { useStoryHistoryStore } from './storyHistory'

function result(storyId: number, title = `이야기 ${storyId}`): StoryHistoryList {
  return {
    storyTemplates: [
      {
        storyTemplateId: 1101,
        title: '별빛 숲의 친구',
        imageUrl: null,
      },
    ],
    stories: [
      {
        storyId,
        storyTemplateId: 1101,
        title,
        imageUrl: null,
        storyStatus: 'COMPLETED',
        generationProgress: 100,
        createdAt: '2026-07-20T10:00:00+09:00',
        lastReadAt: '2026-07-30T10:00:00+09:00',
        readingCompletedAt: null,
        activityAt: '2026-07-30T10:00:00+09:00',
        readLineCount: 2,
        totalLineCount: 4,
        readingProgress: 50,
        readingStatus: 'IN_PROGRESS',
        gazeAnalysisStatus: 'AVAILABLE',
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
  }
}

function repository(
  listHistory: StoryRepository['listHistory'] = vi.fn().mockResolvedValue(result(6801)),
): StoryRepository {
  return { listHistory }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => {
    resolve = next
  })
  return { promise, resolve }
}

describe('story history store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('필터 변경 시 첫 페이지와 이야기 선택을 초기화한다', async () => {
    const store = useStoryHistoryStore()
    store.setRepository(repository())
    await store.loadList(1)
    store.selectStory(6801)
    store.setPage(2)

    store.setFilters({
      from: '2026-07-01',
      to: '2026-07-30',
      storyTemplateId: 1101,
    })

    expect(store.query).toMatchObject({
      from: '2026-07-01',
      to: '2026-07-30',
      storyTemplateId: 1101,
      page: 0,
    })
    expect(store.selectedStoryId).toBeNull()
  })

  it('목록 성공 후 첫 이야기를 자동 선택하지 않는다', async () => {
    const store = useStoryHistoryStore()
    store.setRepository(repository())

    await store.loadList(1)

    expect(store.stories).toHaveLength(1)
    expect(store.selectedStoryId).toBeNull()
    expect(store.listStatus).toBe('success')
  })

  it('학생 전환 중 늦게 끝난 이전 학생 응답을 반영하지 않는다', async () => {
    const first = deferred<StoryHistoryList>()
    const second = deferred<StoryHistoryList>()
    const listHistory = vi
      .fn<StoryRepository['listHistory']>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const store = useStoryHistoryStore()
    store.setRepository(repository(listHistory))

    const firstLoad = store.loadList(1)
    const secondLoad = store.loadList(2)
    second.resolve(result(6901, '두 번째 학생 이야기'))
    await secondLoad
    first.resolve(result(6801, '첫 번째 학생 이야기'))
    await firstLoad

    expect(store.stories.map((story) => story.storyId)).toEqual([6901])
    expect(store.selectedStoryId).toBeNull()
  })

  it('목록 오류 시 필터 값을 유지하고 다시 요청할 수 있다', async () => {
    const listHistory = vi
      .fn<StoryRepository['listHistory']>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(result(6801))
    const store = useStoryHistoryStore()
    store.setRepository(repository(listHistory))
    store.setFilters({ from: '2026-07-01' })

    await store.loadList(1)
    expect(store.listStatus).toBe('error')
    expect(store.query.from).toBe('2026-07-01')

    await store.loadList(1)
    expect(store.listStatus).toBe('success')
    expect(store.stories).toHaveLength(1)
  })
})

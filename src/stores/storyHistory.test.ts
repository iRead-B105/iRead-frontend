import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  StoryDetail,
  StoryGazeAnalysis,
  StoryHistoryList,
  StoryRepository,
} from '@/features/teacher/story'
import { ApiError } from '@/lib/api'
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
  overrides: Partial<StoryRepository> = {},
): StoryRepository {
  return {
    listHistory,
    getDetail: vi.fn().mockRejectedValue(new Error('not configured')),
    getGazeAnalysis: vi.fn().mockRejectedValue(new Error('not configured')),
    ...overrides,
  }
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

  it('시선 결과가 AVAILABLE인 이야기만 상세과 시선을 함께 요청하고 탭을 유지한다', async () => {
    const first = result(6801)
    const secondStory = {
      ...result(6802).stories[0]!,
      gazeAnalysisStatus: 'NOT_COLLECTED' as const,
    }
    const listResult = { ...first, stories: [...first.stories, secondStory], totalElements: 2 }
    const getDetail = vi.fn<StoryRepository['getDetail']>().mockImplementation(
      async (_studentId, storyId) => ({
        story: listResult.stories.find((story) => story.storyId === storyId)!,
        scenes: [],
        branches: [],
      }),
    )
    const getGazeAnalysis = vi
      .fn<StoryRepository['getGazeAnalysis']>()
      .mockResolvedValue({
        gazeSessionId: 1,
        gazeAnalysisId: 2,
        calibrationStatus: 'SUCCESS',
        startedAt: '2026-07-30T10:00:00+09:00',
        endedAt: '2026-07-30T10:01:00+09:00',
        totalVisitedDurationMs: 1_000,
        totalVisitedCount: 2,
        reverseReadCount: 0,
        avgVisitedDurationMs: 500,
        sentenceMetrics: [],
        regressions: [],
        analysisMeta: null,
      })
    const store = useStoryHistoryStore()
    store.setRepository(
      repository(vi.fn().mockResolvedValue(listResult), { getDetail, getGazeAnalysis }),
    )
    await store.loadList(1)

    await store.selectAndLoad(1, 6801)
    store.setActiveTab('content')
    await store.selectAndLoad(1, 6802)

    expect(getDetail).toHaveBeenCalledTimes(2)
    expect(getGazeAnalysis).toHaveBeenCalledTimes(1)
    expect(store.activeTab).toBe('content')
    expect(store.currentDetail?.story.storyId).toBe(6802)
    expect(store.currentGazeAnalysis).toBeNull()
  })

  it('빠른 이야기 전환에서 늦은 상세 응답을 현재 화면에 반영하지 않는다', async () => {
    const firstDetail = deferred<StoryDetail>()
    const secondDetail = deferred<StoryDetail>()
    const base = result(6801)
    const stories = [
      { ...base.stories[0]!, gazeAnalysisStatus: 'NOT_COLLECTED' as const },
      {
        ...result(6802).stories[0]!,
        gazeAnalysisStatus: 'NOT_COLLECTED' as const,
      },
    ]
    const getDetail = vi
      .fn<StoryRepository['getDetail']>()
      .mockImplementationOnce(() => firstDetail.promise)
      .mockImplementationOnce(() => secondDetail.promise)
    const store = useStoryHistoryStore()
    store.setRepository(
      repository(vi.fn().mockResolvedValue({ ...base, stories, totalElements: 2 }), {
        getDetail,
      }),
    )
    await store.loadList(1)

    const firstLoad = store.selectAndLoad(1, 6801)
    const secondLoad = store.selectAndLoad(1, 6802)
    secondDetail.resolve({ story: stories[1]!, scenes: [], branches: [] })
    await secondLoad
    firstDetail.resolve({ story: stories[0]!, scenes: [], branches: [] })
    await firstLoad

    expect(store.selectedStoryId).toBe(6802)
    expect(store.currentDetail?.story.storyId).toBe(6802)
  })

  it('상세 요청 실패가 목록·선택·성공한 시선 결과를 제거하지 않는다', async () => {
    const gaze: StoryGazeAnalysis = {
      gazeSessionId: 1,
      gazeAnalysisId: 2,
      calibrationStatus: 'SUCCESS',
      startedAt: '2026-07-30T10:00:00+09:00',
      endedAt: '2026-07-30T10:01:00+09:00',
      totalVisitedDurationMs: 1_000,
      totalVisitedCount: 2,
      reverseReadCount: 0,
      avgVisitedDurationMs: 500,
      sentenceMetrics: [],
      regressions: [],
      analysisMeta: null,
    }
    const store = useStoryHistoryStore()
    store.setRepository(
      repository(undefined, {
        getDetail: vi.fn().mockRejectedValue(new Error('detail failed')),
        getGazeAnalysis: vi.fn().mockResolvedValue(gaze),
      }),
    )
    await store.loadList(1)

    await store.selectAndLoad(1, 6801)

    expect(store.stories).toHaveLength(1)
    expect(store.selectedStoryId).toBe(6801)
    expect(store.detailStatus).toBe('error')
    expect(store.currentGazeAnalysis).toEqual(gaze)
  })

  it('상세 404이면 선택을 해제하고 목록을 한 번 갱신한다', async () => {
    const noGazeResult = {
      ...result(6801),
      stories: [
        {
          ...result(6801).stories[0]!,
          gazeAnalysisStatus: 'NOT_COLLECTED' as const,
        },
      ],
    }
    const listHistory = vi.fn().mockResolvedValue(noGazeResult)
    const store = useStoryHistoryStore()
    store.setRepository(
      repository(listHistory, {
        getDetail: vi.fn().mockRejectedValue(
          new ApiError({
            status: 404,
            code: 'RESOURCE_NOT_FOUND',
            message: 'not found',
          }),
        ),
      }),
    )
    await store.loadList(1)

    await store.selectAndLoad(1, 6801)

    expect(store.selectedStoryId).toBeNull()
    expect(listHistory).toHaveBeenCalledTimes(2)
    expect(store.listStatus).toBe('success')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { createStoryApi, type StoryApi } from '../api'
import { storyHistoryFixturesByStudent, storyTemplateFixtures } from '../fixtures'
import { ApiStoryRepository } from './apiStoryRepository'
import { MockStoryRepository } from './mockStoryRepository'
import { createStoryRepository } from '.'

function api(overrides: Partial<StoryApi> = {}): StoryApi {
  return {
    listHistory: vi.fn().mockResolvedValue({
      storyTemplates: [],
      stories: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    }),
    ...overrides,
  }
}

describe('StoryRepository factory', () => {
  it('데이터 소스에 따라 구현체만 교체한다', () => {
    const mock = new MockStoryRepository({ delayMs: 0 })
    const apiRepository = new ApiStoryRepository(api())

    expect(createStoryRepository('mock', { mock, api: apiRepository })).toBe(mock)
    expect(createStoryRepository('api', { mock, api: apiRepository })).toBe(apiRepository)
  })
})

describe('Story API target contract', () => {
  it('목록 endpoint에 학생·필터·페이지와 AbortSignal을 전달한다', async () => {
    const raw = {
      storyTemplates: storyTemplateFixtures,
      storyHistory: storyHistoryFixturesByStudent[1]!,
      page: 0,
      size: 20,
      totalElements: 3,
      totalPages: 1,
    }
    const request = vi.fn().mockResolvedValue(raw)
    const storyApi = createStoryApi(request)
    const controller = new AbortController()

    const result = await storyApi.listHistory(
      1,
      {
        from: '2026-07-01',
        to: '2026-07-30',
        storyTemplateId: 1101,
        page: 0,
        size: 20,
      },
      { signal: controller.signal },
    )

    expect(request).toHaveBeenCalledWith(
      '/api/admin/student/1/story-history?from=2026-07-01&to=2026-07-30&storyTemplateId=1101&page=0&size=20',
      { signal: controller.signal },
    )
    expect(result.stories[0]).toMatchObject({
      storyId: 6801,
      title: '별빛 숲의 친구',
      imageUrl: null,
    })
  })
})

describe('MockStoryRepository', () => {
  it('activityAt 최신순으로 필터링하고 빈 결과에서도 전체 템플릿을 유지한다', async () => {
    const repository = new MockStoryRepository({ delayMs: 0 })

    const filtered = await repository.listHistory(1, {
      from: '2026-07-20',
      to: '2026-07-30',
      page: 0,
      size: 20,
    })
    const empty = await repository.listHistory(1, {
      storyTemplateId: 9999,
      page: 0,
      size: 20,
    })

    expect(filtered.stories.map((story) => story.storyId)).toEqual([6801, 6802])
    expect(empty.stories).toEqual([])
    expect(empty.storyTemplates).toHaveLength(storyTemplateFixtures.length)
  })

  it('페이지 범위를 넘으면 오류가 아닌 빈 목록과 요청 페이지를 반환한다', async () => {
    const repository = new MockStoryRepository({ delayMs: 0 })

    const result = await repository.listHistory(1, { page: 3, size: 2 })

    expect(result.stories).toEqual([])
    expect(result.page).toBe(3)
    expect(result.totalElements).toBe(3)
    expect(result.totalPages).toBe(2)
  })
})

import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type {
  StoryHistoryList,
  StoryRepository,
} from '@/features/teacher/story'
import { MockStoryRepository } from '@/features/teacher/story'
import { useStoryHistoryStore } from '@/stores/storyHistory'
import StudentStoryHistoryView from './StudentStoryHistoryView.vue'

const listResult: StoryHistoryList = {
  storyTemplates: [
    {
      storyTemplateId: 1101,
      title: '별빛 숲의 친구',
      imageUrl: null,
    },
  ],
  stories: [
    {
      storyId: 6801,
      storyTemplateId: 1101,
      title: '별빛 숲의 친구',
      imageUrl: null,
      storyStatus: 'COMPLETED',
      generationProgress: 100,
      createdAt: '2026-07-24T15:00:00+09:00',
      lastReadAt: '2026-07-30T16:42:00+09:00',
      readingCompletedAt: null,
      activityAt: '2026-07-30T16:42:00+09:00',
      readLineCount: 9,
      totalLineCount: 12,
      readingProgress: 75,
      readingStatus: 'IN_PROGRESS',
      gazeAnalysisStatus: 'AVAILABLE',
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
}

function repository(
  listHistory: StoryRepository['listHistory'] = vi.fn().mockResolvedValue(listResult),
): StoryRepository {
  const story = listResult.stories[0]!
  return {
    listHistory,
    getDetail: vi.fn().mockResolvedValue({
      story,
      scenes: [],
      branches: [],
    }),
    getGazeAnalysis: vi.fn().mockResolvedValue({
      gazeSessionId: 7401,
      gazeAnalysisId: 7501,
      calibrationStatus: 'SUCCESS',
      startedAt: '2026-07-30T16:40:00+09:00',
      endedAt: '2026-07-30T16:42:00+09:00',
      totalVisitedDurationMs: 38_400,
      totalVisitedCount: 42,
      reverseReadCount: 5,
      avgVisitedDurationMs: 914,
      sentenceMetrics: [],
      regressions: [],
      analysisMeta: null,
    }),
  }
}

async function mountView(storyRepository: StoryRepository = repository()) {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students/:id/story-history',
        name: 'student-story-history',
        component: StudentStoryHistoryView,
      },
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div />' },
      },
    ],
  })
  useStoryHistoryStore(pinia).setRepository(storyRepository)
  await router.push('/teacher/students/1/story-history')
  await router.isReady()
  const wrapper = mount(StudentStoryHistoryView, {
    global: { plugins: [pinia, router] },
  })
  await flushPromises()
  return { wrapper, router, pinia }
}

describe('StudentStoryHistoryView', () => {
  it('목록 성공 후 이야기를 자동 선택하지 않고 선택 시 요약을 표시한다', async () => {
    const { wrapper, pinia } = await mountView()

    expect(wrapper.text()).toContain('별빛 숲의 친구')
    expect(wrapper.text()).toContain('아직 이야기를 읽지 않았어요')
    expect(useStoryHistoryStore(pinia).selectedStoryId).toBeNull()

    await wrapper.get('.story-title-tab').trigger('click')
    await flushPromises()

    expect(useStoryHistoryStore(pinia).selectedStoryId).toBe(6801)
    expect(wrapper.text()).toContain('선택한 이야기')
    expect(wrapper.text()).toContain('읽는 중 (9/12)')
    expect(wrapper.text()).toContain('시선 분석 완료')
    expect(wrapper.find('.story-list-panel').exists()).toBe(false)
    expect(wrapper.get('.story-workspace').classes()).toContain('story-workspace')
  })

  it('시선 분석을 기본으로 네 탭을 정해진 순서와 단일 패널로 표시한다', async () => {
    const { wrapper } = await mountView(new MockStoryRepository({ delayMs: 0 }))
    expect(wrapper.findAll('.story-title-tab')).toHaveLength(3)

    await wrapper.get('.story-title-tab').trigger('click')
    await flushPromises()

    const tabs = wrapper.findAll('.story-detail-tabs [role="tab"]')
    expect(tabs.map((tab) => tab.text())).toEqual([
      '시선 분석',
      '이야기 내용',
      '분기 기록',
      '생성 이미지',
    ])
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('.story-detail-tabpanel[role="tabpanel"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('문장별 시선 분석')
    expect(wrapper.text()).toContain('별빛이 내려앉은 숲에서 토끼가 길을 찾아요.')

    await tabs[1]!.trigger('click')
    expect(wrapper.text()).toContain('1번째 장면')
    expect(wrapper.text()).toContain('분기 문장')
    expect(wrapper.text()).not.toContain('문장별 시선 분석')

    await wrapper.findAll('.story-detail-tabs [role="tab"]')[2]!.trigger('click')
    expect(wrapper.text()).toContain('토끼가 먼저 누구에게 도움을 요청하면 좋을까?')
    expect(wrapper.text()).toContain('별을 잘 아는 부엉이에게 물어보면 좋겠어요.')

    await wrapper.findAll('.story-detail-tabs [role="tab"]')[3]!.trigger('click')
    expect(wrapper.findAll('.story-image-frame img')).toHaveLength(2)
    expect(wrapper.text()).toContain('이미지 생성 중')
    expect(wrapper.text()).toContain('이미지 생성 실패')
  })

  it('시선 상태가 AVAILABLE이 아니면 시선 상세를 요청하지 않는다', async () => {
    const noGazeList = {
      ...listResult,
      stories: [
        {
          ...listResult.stories[0]!,
          gazeAnalysisStatus: 'RUNNING' as const,
        },
      ],
    }
    const getGazeAnalysis = vi.fn<StoryRepository['getGazeAnalysis']>()
    const detailRepository = {
      ...repository(vi.fn().mockResolvedValue(noGazeList)),
      getGazeAnalysis,
    }
    const { wrapper } = await mountView(detailRepository)

    await wrapper.get('.story-title-tab').trigger('click')
    await flushPromises()

    expect(getGazeAnalysis).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('시선 분석을 준비하고 있어요')
  })

  it('기간·원본 이야기 필터를 page 0으로 Repository에 전달한다', async () => {
    const listHistory = vi.fn<StoryRepository['listHistory']>().mockResolvedValue(listResult)
    const { wrapper } = await mountView(repository(listHistory))

    await wrapper.get('#story-from').setValue('2026-07-01')
    await wrapper.get('#story-to').setValue('2026-07-30')
    await wrapper.get('#story-template').setValue('1101')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(listHistory).toHaveBeenLastCalledWith(
      1,
      {
        from: '2026-07-01',
        to: '2026-07-30',
        storyTemplateId: 1101,
        page: 0,
        size: 20,
      },
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('빈 목록에서도 필터 선택지를 유지하고 정상 빈 상태를 표시한다', async () => {
    const { wrapper } = await mountView(
      repository(
        vi.fn().mockResolvedValue({
          ...listResult,
          stories: [],
          totalElements: 0,
          totalPages: 0,
        }),
      ),
    )

    expect(wrapper.get('#story-template').text()).toContain('별빛 숲의 친구')
    expect(wrapper.text()).toContain('선택한 기간과 이야기 종류에 해당하는 읽기 이력이 없습니다.')
  })
})

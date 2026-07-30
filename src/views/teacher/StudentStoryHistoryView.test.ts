import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type {
  StoryHistoryList,
  StoryRepository,
} from '@/features/teacher/story'
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
  return { listHistory }
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

    await wrapper.get('.story-list-item').trigger('click')

    expect(useStoryHistoryStore(pinia).selectedStoryId).toBe(6801)
    expect(wrapper.text()).toContain('선택한 이야기')
    expect(wrapper.text()).toContain('읽는 중 (9/12)')
    expect(wrapper.text()).toContain('시선 분석 완료')
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

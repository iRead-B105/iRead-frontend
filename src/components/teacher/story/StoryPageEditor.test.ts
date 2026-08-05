import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { StoryPage } from '@/features/teacher/story'
import StoryPageEditor from './StoryPageEditor.vue'

const { updatePage } = vi.hoisted(() => ({
  updatePage: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/features/teacher/story', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/features/teacher/story')>()
  return {
    ...original,
    createStoryApi: () => ({
      updatePage,
      uploadPageImage: vi.fn(),
      regeneratePageImage: vi.fn(),
    }),
  }
})

function createPage(overrides: Partial<StoryPage> = {}): StoryPage {
  return {
    pageNo: 1,
    storyLineId: 101,
    sceneId: 11,
    sceneOrder: 1,
    lineOrder: 1,
    backgroundImageUrl: null,
    backgroundImagePosition: 'center',
    imageGenerationStatus: 'AVAILABLE',
    textLines: ['첫 번째 문장입니다.', '두 번째 문장입니다.', '세 번째 문장입니다.'],
    requiresBranchInput: false,
    readAt: null,
    branchRecord: null,
    revision: 1,
    editable: true,
    ...overrides,
  }
}

describe('StoryPageEditor', () => {
  it('같은 페이지를 다시 불러와도 저장 성공 메시지를 유지한다', async () => {
    const wrapper = mount(StoryPageEditor, {
      props: { studentId: 2001, storyId: 180160, page: createPage() },
    })

    await wrapper.findAll('.editor-actions button').at(-1)!.trigger('click')
    await flushPromises()

    const savedMessage = wrapper.get('.editor-message').text()
    expect(savedMessage).not.toBe('')
    expect(wrapper.emitted('updated')).toHaveLength(1)

    await wrapper.setProps({ page: createPage({ revision: 2 }) })
    expect(wrapper.get('.editor-message').text()).toBe(savedMessage)
  })

  it('다른 페이지로 이동하면 이전 작업 메시지를 지운다', async () => {
    const wrapper = mount(StoryPageEditor, {
      props: { studentId: 2001, storyId: 180160, page: createPage() },
    })

    await wrapper.findAll('.editor-actions button').at(-1)!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.editor-message').exists()).toBe(true)

    await wrapper.setProps({ page: createPage({ pageNo: 2, storyLineId: 102 }) })
    expect(wrapper.find('.editor-message').exists()).toBe(false)
  })
})

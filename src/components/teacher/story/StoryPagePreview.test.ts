import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StoryPagePreview from './StoryPagePreview.vue'
import type { StoryPage } from '@/features/teacher/story'

const page: StoryPage = {
  pageNo: 1,
  storyLineId: 10,
  sceneId: 20,
  sceneOrder: 1,
  lineOrder: 1,
  backgroundImageUrl: null,
  backgroundImagePosition: 'center',
  imageGenerationStatus: 'NOT_REQUESTED',
  textLines: [
    '아기돼지 삼형제가 흙길에 모였어요. 돼지가 “난 짚집부터 빨리 끝낼래!” 말해요. 늑대는 먼발치에서 코를 킁킁대요.',
  ],
  requiresBranchInput: false,
  readAt: null,
  branchRecord: null,
}

describe('StoryPagePreview', () => {
  it('renders one paragraph per sentence without a local replay toggle', () => {
    const wrapper = mount(StoryPagePreview, {
      props: { page, studentId: 2001, storyId: 180147 },
    })

    const paragraphs = wrapper.findAll('.story-reader-copy > p')
    expect(paragraphs).toHaveLength(3)
    expect(paragraphs[1]?.text()).toContain('끝낼래!” 말해요.')
    expect(wrapper.find('.story-reader-copy__toolbar').exists()).toBe(false)
  })

  it('shows dwell heat only while the analysis heatmap is enabled', async () => {
    const wrapper = mount(StoryPagePreview, {
      props: {
        page,
        studentId: 2001,
        storyId: 180147,
        heatmapVisible: false,
        heatmapWords: [{
          questionNo: 1,
          targetIndex: 0,
          tokenIndex: 0,
          text: '아기돼지',
          dwellMs: 2500,
          visitCount: 1,
          skipped: false,
          regressionCount: 0,
          firstSeenMs: 0,
          lastSeenMs: 2500,
        }],
      },
    })

    const firstWord = wrapper.find('.story-reader-word')
    expect(firstWord.attributes('style')).toBeUndefined()

    await wrapper.setProps({ heatmapVisible: true })
    expect(firstWord.attributes('style')).toContain('--heatmap-intensity')
    expect(wrapper.findAll('.story-reader-word').every((word) => word.attributes('style')?.includes('--heatmap-intensity'))).toBe(true)
  })
})

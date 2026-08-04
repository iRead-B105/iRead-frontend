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
          storyLineId: 10,
          pageNo: 1,
          tokenIndex: 0,
          text: '아기돼지',
          dwellDurationMs: 2500,
          visitCount: 1,
          skipped: false,
          regressionCount: 0,
          firstSeenMs: 0,
        }, {
          storyLineId: 10,
          pageNo: 1,
          tokenIndex: 1,
          text: '삼형제가',
          dwellDurationMs: 0,
          visitCount: 0,
          skipped: true,
          regressionCount: 0,
          firstSeenMs: null,
        }, {
          storyLineId: 10,
          pageNo: 1,
          tokenIndex: 2,
          text: '흙길에',
          dwellDurationMs: 1200,
          visitCount: 2,
          skipped: false,
          regressionCount: 1,
          firstSeenMs: 700,
        }],
      },
    })

    const firstWord = wrapper.find('.story-reader-word')
    expect(firstWord.attributes('style')).toBeUndefined()

    await wrapper.setProps({ heatmapVisible: true })
    expect(firstWord.attributes('style')).toContain('--heatmap-intensity')
    expect(wrapper.findAll('.story-reader-word')[1]?.attributes('style')).toBeUndefined()
    expect(wrapper.findAll('.story-reader-word')[1]?.classes()).toContain('is-heatmap-skipped')
    expect(wrapper.findAll('.story-reader-word')[2]?.classes()).toContain('is-heatmap-regression')
  })

  it('현재 Backend 판정 event의 출발 단어와 도착 단어 사이만 표시한다', async () => {
    const wrapper = mount(StoryPagePreview, {
      props: {
        page,
        studentId: 2001,
        storyId: 180147,
        activeReplayKind: 'skip',
        activeReplayTokenIndexes: [1, 2],
        activeReplayFromTokenIndex: 0,
        activeReplayToTokenIndex: 2,
      },
    })

    await wrapper.vm.$nextTick()

    expect(wrapper.find('.story-reader-replay-path.is-skip').exists()).toBe(true)
    expect(wrapper.find('.story-reader-replay-path line').attributes('marker-end')).toContain(
      'story-replay-arrow-10',
    )
    expect(wrapper.findAll('.story-reader-word.is-replay-skip')).toHaveLength(2)

    await wrapper.setProps({ heatmapVisible: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.story-reader-replay-path').exists()).toBe(false)
    expect(wrapper.findAll('.story-reader-word.is-replay-skip')).toHaveLength(0)
  })
})

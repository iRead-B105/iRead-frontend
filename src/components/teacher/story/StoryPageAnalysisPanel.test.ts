import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mapStoryGazeAnalysis } from '@/features/teacher/story'
import { storyGazeFixturesByStoryId } from '@/test/fixtures/story'
import StoryPageAnalysisPanel from './StoryPageAnalysisPanel.vue'

const analysis = mapStoryGazeAnalysis(storyGazeFixturesByStoryId[6801]!)
const metric = analysis.pageMetrics.find((item) => item.pageNo === 1)!
const page = {
  pageNo: 1,
  storyLineId: 7201,
  sceneId: 7101,
  sceneOrder: 1,
  lineOrder: 1,
  backgroundImageUrl: null,
  backgroundImagePosition: 'center',
  imageGenerationStatus: 'NOT_REQUESTED' as const,
  textLines: [metric.surfaceText],
  requiresBranchInput: false,
  readAt: null,
  branchRecord: null,
}

function mountPanel() {
  return mount(StoryPageAnalysisPanel, {
    props: {
      storyStatus: 'AVAILABLE',
      page,
      analysis,
      metric,
      requestStatus: 'success',
      error: null,
      contractError: null,
      heatmapVisible: false,
    },
  })
}

describe('StoryPageAnalysisPanel', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('Backend events를 700ms 간격으로 재생한 뒤 히트맵으로 전환한다', async () => {
    const wrapper = mountPanel()
    const replayButton = wrapper.get('.story-page-replay__actions .is-primary')

    expect(wrapper.text()).toContain('3개 판정 이벤트')
    expect(wrapper.emitted('replayStepChange')?.at(-1)?.[0]).toMatchObject({
      fromTokenIndex: null,
      toTokenIndex: 0,
      kind: 'read',
    })

    await replayButton.trigger('click')
    await vi.advanceTimersByTimeAsync(700)
    expect(wrapper.emitted('replayStepChange')?.at(-1)?.[0]).toMatchObject({
      fromTokenIndex: 0,
      toTokenIndex: 2,
      kind: 'skip',
      tokenIndexes: [1, 2],
    })

    await vi.advanceTimersByTimeAsync(700)
    expect(wrapper.emitted('replayStepChange')?.at(-1)?.[0]).toMatchObject({
      fromTokenIndex: 2,
      toTokenIndex: 1,
      kind: 'regression',
    })

    await vi.advanceTimersByTimeAsync(700)
    expect(wrapper.emitted('heatmapVisibilityChange')?.at(-1)?.[0]).toBe(true)

    await wrapper.setProps({ heatmapVisible: true })
    expect(replayButton.text()).toBe('다시 보기')
    await replayButton.trigger('click')
    expect(wrapper.emitted('heatmapVisibilityChange')?.at(-1)?.[0]).toBe(false)
    expect(wrapper.emitted('replayStepChange')?.at(-1)?.[0]).toMatchObject({ toTokenIndex: 0 })
  })

  it('상세 목록은 wordMetrics의 최종 상태만 사용하고 pageMetrics로 추정하지 않는다', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('1회 되돌아봄')
    expect(wrapper.text()).toContain('최종적으로 건너뛴 단어가 없습니다.')

    const emptyAnalysis = { ...analysis, wordMetrics: [] }
    const emptyWrapper = mount(StoryPageAnalysisPanel, {
      props: {
        storyStatus: 'AVAILABLE',
        page,
        analysis: emptyAnalysis,
        metric,
        requestStatus: 'success',
        error: null,
        contractError: null,
        heatmapVisible: false,
      },
    })
    expect(emptyWrapper.text()).toContain('단어별 시선 기록이 없습니다')
    expect(emptyWrapper.text()).toContain('페이지 집계값을 단어별 값으로 추정하지 않습니다.')
  })

  it('판정 event가 없고 실제 wordMetrics만 있으면 히트맵을 바로 표시한다', () => {
    const wrapper = mount(StoryPageAnalysisPanel, {
      props: {
        storyStatus: 'AVAILABLE',
        page,
        analysis: { ...analysis, replay: null },
        metric,
        requestStatus: 'success',
        error: null,
        contractError: null,
        heatmapVisible: false,
      },
    })

    expect(wrapper.text()).toContain('재생 기록 없음')
    expect(wrapper.emitted('heatmapVisibilityChange')?.at(-1)?.[0]).toBe(true)
  })
})

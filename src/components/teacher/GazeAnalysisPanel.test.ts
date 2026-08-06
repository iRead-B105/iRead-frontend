import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GazeAnalysisPanel from './GazeAnalysisPanel.vue'

const available = {
  status: 'AVAILABLE' as const,
  analysis: {
    gazeSessionId: 11,
    gazeAnalysisResultId: 21,
    totalVisitedDurationMs: 62_340,
    totalVisitedCount: 12,
    reverseReadCount: 3,
    avgVisitedDurationMs: null,
  },
}

describe('GazeAnalysisPanel', () => {
  it('AVAILABLE에서 계약의 네 집계 지표만 표시한다', () => {
    const wrapper = mount(GazeAnalysisPanel, {
      props: { state: available, status: 'success' },
    })

    expect(wrapper.text()).toContain('1분 2.34초')
    expect(wrapper.text()).toContain('평균 시선 체류 시간-')
    expect(wrapper.text()).toContain('12회')
    expect(wrapper.text()).toContain('3회')
    expect(wrapper.text()).not.toContain('집계 지표 비교')
    expect(wrapper.text()).not.toContain('의학적 진단 결과가 아닙니다.')
    expect(wrapper.text()).not.toContain('읽기 이탈')
    expect(wrapper.text()).not.toContain('권장')
    expect(wrapper.text()).not.toContain('%')
  })

  it.each([
    ['NO_DATA', '시선 분석 데이터가 없습니다.'],
    ['FAILED', '시선 분석을 완료하지 못했습니다.'],
  ] as const)('%s 도메인 상태를 요청 오류와 구분한다', (state, message) => {
    const wrapper = mount(GazeAnalysisPanel, {
      props: {
        state: { status: state, analysis: null },
        status: 'success',
      },
    })

    expect(wrapper.text()).toContain(message)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('요청 오류에서 오류 안내와 재시도 이벤트를 제공한다', async () => {
    const wrapper = mount(GazeAnalysisPanel, {
      props: {
        state: null,
        status: 'error',
        error: '서버에 연결할 수 없습니다.',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('서버에 연결할 수 없습니다.')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})

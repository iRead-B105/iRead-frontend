import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { refreshedReportGazeTrendFixture } from '@/test/fixtures/report'
import ReportGazeTrend from './ReportGazeTrend.vue'

function mountTrend(showAutomaticAnalysis: boolean) {
  return mount(ReportGazeTrend, {
    props: {
      trend: refreshedReportGazeTrendFixture,
      showAutomaticAnalysis,
    },
    global: {
      stubs: {
        ChartPanel: {
          props: ['ariaLabel'],
          template: '<div data-test="chart">{{ ariaLabel }}</div>',
        },
      },
    },
  })
}

describe('ReportGazeTrend', () => {
  it('숫자 시선 추이는 유지하면서 미연동 자동 분석 문구를 숨긴다', () => {
    const wrapper = mountTrend(false)

    expect(wrapper.text()).toContain('훈련 시선 추이')
    expect(wrapper.text()).toContain('되돌아보기 횟수')
    expect(wrapper.text()).toContain('시선 자동 분석 문구는 규칙 기반 Backend 연동 후 제공됩니다.')
    expect(wrapper.text()).not.toContain('되돌아보기 횟수는 7회에서 5회로 2회 감소했습니다.')
  })

  it('통일된 보고서에서는 저장된 규칙 기반 시선 분석을 표시한다', () => {
    const wrapper = mountTrend(true)

    expect(wrapper.text()).toContain('되돌아보기 횟수는 7회에서 5회로 2회 감소했습니다.')
    expect(wrapper.text()).not.toContain('규칙 기반 Backend 연동 후 제공됩니다.')
  })
})

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { reportSnapshotFixture } from '@/features/teacher/report'
import ReportLearningSnapshot from './ReportLearningSnapshot.vue'

function mountSnapshot(readingSpeedUnit: string | null) {
  return mount(ReportLearningSnapshot, {
    props: {
      snapshot: {
        ...reportSnapshotFixture,
        readingSpeedUnit,
      },
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

describe('ReportLearningSnapshot', () => {
  it('통일된 계산 응답은 정확도·속도와 독립 성장 그래프 및 자동 분석을 표시한다', () => {
    const wrapper = mountSnapshot('CORRECT_WORDS_PER_MINUTE')

    expect(wrapper.text()).toContain('평균 정확도')
    expect(wrapper.text()).toContain('84.5%')
    expect(wrapper.text()).toContain('72.4 단어/분')
    expect(wrapper.findAll('[data-test="chart"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('받침이 있는 두 음절 낱말 읽기')
    expect(wrapper.text()).toContain('긴 문장에서 조사와 어미를 이어 읽기')
  })

  it('현재 Backend의 이전 계산 응답은 값과 자동 분석을 숨기고 연동 예정 상태를 표시한다', () => {
    const wrapper = mountSnapshot('CPM')

    expect(wrapper.text()).toContain('정확도·읽기 속도 계산 기준 연동 예정')
    expect(wrapper.text()).toContain('성장 그래프 데이터 연동 예정')
    expect(wrapper.text()).toContain('규칙 기반 자동 분석 연동 예정')
    expect(wrapper.text()).not.toContain('84.5%')
    expect(wrapper.text()).not.toContain('받침이 있는 두 음절 낱말 읽기')
    expect(wrapper.findAll('[data-test="chart"]')).toHaveLength(0)
  })
})

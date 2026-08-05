import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { reportSnapshotFixture } from '@/test/fixtures/report'
import type { ReportSnapshot } from '@/features/teacher/report'
import ReportLearningSnapshot from './ReportLearningSnapshot.vue'

function mountSnapshot(overrides: Partial<ReportSnapshot> = {}) {
  return mount(ReportLearningSnapshot, {
    props: {
      snapshot: {
        ...reportSnapshotFixture,
        ...overrides,
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
    const wrapper = mountSnapshot()

    expect(wrapper.text()).toContain('평균 정확도')
    expect(wrapper.text()).toContain('84.5%')
    expect(wrapper.text()).toContain('72.4 단어/분')
    expect(wrapper.findAll('[data-test="chart"]')).toHaveLength(3)
    expect(wrapper.text()).toContain('읽기 정확도가 72.00에서 86.00로 증가했습니다.')
    expect(wrapper.text()).toContain('영역별 향상·지속 관찰 판정 기준은 아직 제공되지 않습니다.')
  })

  it('이전 계산 응답은 신규 값과 자동 분석을 숨기고 이전 기준 상태를 표시한다', () => {
    const wrapper = mountSnapshot({
      snapshotVersion: null,
      calculationVersion: null,
      readingSpeedUnit: 'CPM',
      growthComparisonStatus: null,
      automaticAnalysis: null,
    })

    expect(wrapper.text()).toContain('이전 계산 기준으로 생성된 보고서입니다')
    expect(wrapper.text()).toContain('이전 계산 기준의 성장 값입니다')
    expect(wrapper.text()).toContain('이전 계산 기준에는 자동 분석이 없습니다')
    expect(wrapper.text()).not.toContain('84.5%')
    expect(wrapper.text()).not.toContain('읽기 정확도가 72.00에서 86.00로 증가했습니다.')
    expect(wrapper.findAll('[data-test="chart"]')).toHaveLength(0)
  })

  it('한 시점 보고서는 현재 성장 값을 표시하고 비교 부족 설명을 구분한다', () => {
    const firstPoint = reportSnapshotFixture.growthHistory[0]!
    const wrapper = mountSnapshot({
      learningDays: 1,
      growthHistory: [firstPoint],
      growthComparisonStatus: 'INSUFFICIENT_DATA',
      automaticAnalysis: {
        status: 'INSUFFICIENT_DATA',
        metricChanges: [],
        descriptions: ['비교할 기록이 부족합니다.'],
      },
    })

    expect(wrapper.text()).toContain('현재 값은 표시하지만 변화를 비교할 기록이 부족합니다.')
    expect(wrapper.text()).toContain('비교할 기록이 부족합니다.')
    expect(wrapper.findAll('[data-test="chart"]')).toHaveLength(3)
  })
})

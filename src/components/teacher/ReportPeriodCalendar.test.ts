import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReportPeriodCalendar from './ReportPeriodCalendar.vue'

describe('ReportPeriodCalendar', () => {
  it('완료 훈련 수와 선택 기간을 같은 달력에 표시한다', () => {
    const wrapper = mount(ReportPeriodCalendar, {
      props: {
        startDate: '2026-07-05',
        endDate: '2026-07-24',
        today: '2026-07-30',
        completedDateCounts: {
          '2026-07-05': 2,
          '2026-07-21': 1,
        },
        historyStatus: 'success',
      },
    })

    expect(wrapper.get('[aria-label^="2026-07-05"]').attributes('aria-label')).toContain(
      '완료 훈련 2개',
    )
    expect(wrapper.findAll('[aria-pressed="true"]')).toHaveLength(2)
    expect(wrapper.emitted('visibleRange')?.[0]).toEqual([
      { from: '2026-07-01', to: '2026-07-31' },
    ])
  })

  it('시작일과 종료일을 순서대로 선택한다', async () => {
    const wrapper = mount(ReportPeriodCalendar, {
      props: {
        startDate: '2026-07-01',
        endDate: '2026-07-28',
        today: '2026-07-30',
      },
    })

    await wrapper.get('[aria-label^="2026-07-10"]').trigger('click')
    await wrapper.setProps({ startDate: '2026-07-10', endDate: '2026-07-10' })
    await wrapper.get('[aria-label^="2026-07-20"]').trigger('click')

    expect(wrapper.emitted('update:startDate')).toEqual([['2026-07-10']])
    expect(wrapper.emitted('update:endDate')).toEqual([
      ['2026-07-10'],
      ['2026-07-20'],
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { ALIGNED_REPORT_READING_SPEED_UNIT, hasAlignedReportLearningMetrics } from './presenters'

describe('report metric alignment', () => {
  it('학습 현황과 같은 읽기 속도 단위만 통일된 보고서로 판정한다', () => {
    expect(
      hasAlignedReportLearningMetrics({
        readingSpeedUnit: ALIGNED_REPORT_READING_SPEED_UNIT,
      }),
    ).toBe(true)
    expect(hasAlignedReportLearningMetrics({ readingSpeedUnit: 'CPM' })).toBe(false)
    expect(hasAlignedReportLearningMetrics({ readingSpeedUnit: null })).toBe(false)
  })
})

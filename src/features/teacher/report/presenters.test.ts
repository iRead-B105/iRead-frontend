import { describe, expect, it } from 'vitest'
import {
  ALIGNED_REPORT_CALCULATION_VERSION,
  ALIGNED_REPORT_READING_SPEED_UNIT,
  ALIGNED_REPORT_SNAPSHOT_VERSION,
  formatReportDateTime,
  hasAlignedReportLearningMetrics,
} from './presenters'

describe('report metric alignment', () => {
  it('신규 snapshot 버전·계산 버전·읽기 속도 단위가 모두 일치해야 통일된 보고서로 판정한다', () => {
    const aligned = {
      snapshotVersion: ALIGNED_REPORT_SNAPSHOT_VERSION,
      calculationVersion: ALIGNED_REPORT_CALCULATION_VERSION,
      readingSpeedUnit: ALIGNED_REPORT_READING_SPEED_UNIT,
    }
    expect(
      hasAlignedReportLearningMetrics(aligned),
    ).toBe(true)
    expect(hasAlignedReportLearningMetrics({ ...aligned, snapshotVersion: null })).toBe(false)
    expect(hasAlignedReportLearningMetrics({ ...aligned, calculationVersion: null })).toBe(false)
    expect(hasAlignedReportLearningMetrics({ ...aligned, readingSpeedUnit: 'CPM' })).toBe(false)
  })
})

describe('report date presentation', () => {
  it('보고서 생성시각을 실행 환경과 무관하게 한국시간으로 표시한다', () => {
    const formatted = formatReportDateTime('2026-08-06T16:30:00Z')

    expect(formatted).toContain('2026. 08. 07')
    expect(formatted).toContain('01:30')
  })

  it('timezone 없는 서버 LocalDateTime을 한국시간으로 해석한다', () => {
    const formatted = formatReportDateTime('2026-08-07T01:30:00')

    expect(formatted).toContain('2026. 08. 07')
    expect(formatted).toContain('01:30')
  })
})

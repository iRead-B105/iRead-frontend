import { describe, expect, it } from 'vitest'
import { testDetailFixtures } from '@/test/fixtures/test'
import { averageTestMetric, testMetricValue } from './metrics'

describe('실력 도전 검사 지표 계산', () => {
  it('검사 커리큘럼 전체 점수에서 null만 제외하고 실제 0을 표본에 포함한다', () => {
    const details = testDetailFixtures.slice(0, 4)

    expect(averageTestMetric(details, 'overallScore')).toEqual({
      value: 58.5,
      sampleCount: 4,
    })
  })

  it('문항별 시선 이탈 합계와 음성 문항 발음 평균을 비교 지표로 사용한다', () => {
    const detail = testDetailFixtures[0]!

    expect(testMetricValue(detail, 'gazeDepartureCount')).toBe(7)
    expect(testMetricValue(detail, 'pronunciationScore')).toBe(84.7)
  })

  it('측정값 없음과 실제 0을 구분한다', () => {
    const zero = testDetailFixtures[3]!
    const missing = { ...zero, overallScore: null, pronunciationScore: null }

    expect(testMetricValue(zero, 'overallScore')).toBe(0)
    expect(testMetricValue(missing, 'overallScore')).toBeNull()
    expect(averageTestMetric([zero, missing], 'overallScore')).toEqual({
      value: 0,
      sampleCount: 1,
    })
  })
})

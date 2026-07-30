import { describe, expect, it } from 'vitest'
import { testDetailFixtures } from './fixtures'
import { testGazeFixtures } from '@/features/teacher/gaze'
import {
  averageReverseReadCount,
  averageTestMetric,
  testGazeMap,
  testMetricValue,
} from './metrics'

const studentOneDetails = testDetailFixtures.filter((detail) => detail.testId < 2_000)
const gazeResults = Object.entries(testGazeFixtures)
  .filter(([testId]) => Number(testId) < 2_000)
  .map(([testId, state]) => ({ testId: Number(testId), state }))
const gazeByTestId = testGazeMap(gazeResults)

describe('검사 지표 계산', () => {
  it('정확도와 문제 풀이 시간은 null만 제외하고 0을 표본에 포함한다', () => {
    expect(averageTestMetric(studentOneDetails, 'accuracy', gazeByTestId)).toEqual({
      value: 58.5,
      sampleCount: 4,
    })
    expect(averageTestMetric(studentOneDetails, 'solvingTimeSeconds', gazeByTestId)).toEqual({
      value: 140.8,
      sampleCount: 4,
    })
  })

  it('시선 이탈 평균은 AVAILABLE 검사만 사용하고 선택 막대의 실제 값은 유지한다', () => {
    expect(averageTestMetric(studentOneDetails, 'gazeDepartureCount', gazeByTestId)).toEqual({
      value: 1,
      sampleCount: 2,
    })
    expect(testMetricValue(studentOneDetails[1]!, 'gazeDepartureCount', gazeByTestId)).toBe(5)
  })

  it('시선 역행 평균은 NO_DATA와 FAILED를 제외하고 0을 표본에 포함한다', () => {
    expect(averageReverseReadCount(gazeResults)).toEqual({
      value: 4.5,
      sampleCount: 2,
    })
    expect(testMetricValue(studentOneDetails[1]!, 'reverseReadCount', gazeByTestId)).toBeNull()
  })
})

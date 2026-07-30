import type { GazeAnalysisState } from '@/features/teacher/gaze'
import type { TestDetail, TestGazeResult } from './model'

export type TestMetricKey =
  | 'accuracy'
  | 'solvingTimeSeconds'
  | 'gazeDepartureCount'
  | 'reverseReadCount'

export interface TestMetricAverage {
  readonly value: number | null
  readonly sampleCount: number
}

export function testGazeMap(
  results: readonly TestGazeResult[],
): ReadonlyMap<number, GazeAnalysisState> {
  return new Map(results.map((result) => [result.testId, result.state]))
}

export function testMetricValue(
  detail: TestDetail,
  metric: TestMetricKey,
  gazeByTestId: ReadonlyMap<number, GazeAnalysisState>,
): number | null {
  if (metric === 'accuracy') return detail.accuracy
  if (metric === 'solvingTimeSeconds') return detail.solvingTimeSeconds
  if (metric === 'gazeDepartureCount') return detail.gazeDepartureCount

  const gaze = gazeByTestId.get(detail.testId)
  if (gaze?.status !== 'AVAILABLE') return null
  return gaze.analysis.reverseReadCount
}

export function averageTestMetric(
  details: readonly TestDetail[],
  metric: TestMetricKey,
  gazeByTestId: ReadonlyMap<number, GazeAnalysisState>,
): TestMetricAverage {
  const eligibleDetails =
    metric === 'gazeDepartureCount'
      ? details.filter((detail) => gazeByTestId.get(detail.testId)?.status === 'AVAILABLE')
      : details
  const values = eligibleDetails
    .map((detail) => testMetricValue(detail, metric, gazeByTestId))
    .filter((value): value is number => value !== null && Number.isFinite(value))

  if (values.length === 0) {
    return { value: null, sampleCount: 0 }
  }

  return {
    value: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
    sampleCount: values.length,
  }
}

export function averageReverseReadCount(
  results: readonly TestGazeResult[],
): TestMetricAverage {
  const values = results
    .filter((result) => result.state.status === 'AVAILABLE')
    .map((result) =>
      result.state.status === 'AVAILABLE' ? result.state.analysis.reverseReadCount : null,
    )
    .filter((value): value is number => value !== null && Number.isFinite(value))

  if (values.length === 0) {
    return { value: null, sampleCount: 0 }
  }

  return {
    value: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
    sampleCount: values.length,
  }
}

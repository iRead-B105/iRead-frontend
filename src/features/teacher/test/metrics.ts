import type { TestDetail } from './model'

export type TestMetricKey =
  | 'overallScore'
  | 'solvingTimeSeconds'
  | 'gazeDepartureCount'
  | 'pronunciationScore'

export interface TestMetricAverage {
  readonly value: number | null
  readonly sampleCount: number
}

export function testMetricValue(detail: TestDetail, metric: TestMetricKey): number | null {
  return detail[metric]
}

export function averageTestMetric(
  details: readonly TestDetail[],
  metric: TestMetricKey,
): TestMetricAverage {
  const values = details
    .map((detail) => testMetricValue(detail, metric))
    .filter((value): value is number => value !== null && Number.isFinite(value))
  if (values.length === 0) return { value: null, sampleCount: 0 }
  return {
    value: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10,
    sampleCount: values.length,
  }
}

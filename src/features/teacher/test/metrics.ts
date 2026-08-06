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
  if (metric === 'overallScore' || metric === 'pronunciationScore') {
    return detail[metric]
  }
  const questions = detail.questions ?? []
  const values = questions
    .map((q) => q[metric])
    .filter((v): v is number => v !== null && Number.isFinite(v))
  if (values.length === 0) return detail[metric]
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
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

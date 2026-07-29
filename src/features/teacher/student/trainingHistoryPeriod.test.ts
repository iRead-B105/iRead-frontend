import { describe, expect, it } from 'vitest'
import { resolveTrainingHistoryDateRange } from './trainingHistoryPeriod'

describe('resolveTrainingHistoryDateRange', () => {
  it('오늘을 포함한 최근 30일의 시작일과 종료일을 계산한다', () => {
    expect(
      resolveTrainingHistoryDateRange('30d', new Date('2026-07-29T23:30:00')),
    ).toEqual({
      from: '2026-06-30',
      to: '2026-07-29',
    })
  })

  it('3개월 전 같은 날짜부터 오늘까지를 계산한다', () => {
    expect(
      resolveTrainingHistoryDateRange('3m', new Date('2026-07-29T08:00:00')),
    ).toEqual({
      from: '2026-04-29',
      to: '2026-07-29',
    })
  })

  it('대상 월에 같은 날짜가 없으면 해당 월의 마지막 날을 사용한다', () => {
    expect(
      resolveTrainingHistoryDateRange('3m', new Date('2026-05-31T08:00:00')),
    ).toEqual({
      from: '2026-02-28',
      to: '2026-05-31',
    })
  })
})

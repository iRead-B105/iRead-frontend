import { describe, expect, it } from 'vitest'
import { formatGazeAverage, formatGazeCount, formatGazeDuration, mapGazeAnalysisState } from '.'

describe('Gaze analysis target contract', () => {
  it('AVAILABLE 응답의 4개 집계값과 nullable 평균을 보존한다', () => {
    expect(
      mapGazeAnalysisState({
        status: 'AVAILABLE',
        analysis: {
          gazeSessionId: 11,
          gazeAnalysisResultId: 21,
          totalVisitedDurationMs: 62_340,
          totalVisitedCount: 12,
          reverseReadCount: 3,
          avgVisitedDurationMs: null,
        },
      }),
    ).toEqual({
      status: 'AVAILABLE',
      analysis: {
        gazeSessionId: 11,
        gazeAnalysisResultId: 21,
        totalVisitedDurationMs: 62_340,
        totalVisitedCount: 12,
        reverseReadCount: 3,
        avgVisitedDurationMs: null,
      },
    })
  })

  it('도메인 상태와 analysis 조합이 맞지 않으면 계약 오류로 거부한다', () => {
    expect(() => mapGazeAnalysisState({ status: 'AVAILABLE', analysis: null })).toThrow(
      'AVAILABLE 상태에는 analysis가 필요합니다.',
    )
    expect(() =>
      mapGazeAnalysisState({
        status: 'NO_DATA',
        analysis: {
          gazeSessionId: 1,
          gazeAnalysisResultId: 2,
          totalVisitedDurationMs: 0,
          totalVisitedCount: 0,
          reverseReadCount: 0,
          avgVisitedDurationMs: null,
        },
      }),
    ).toThrow('NO_DATA 상태의 analysis는 null이어야 합니다.')
  })

  it('음수·소수 횟수와 기존 flat 응답을 계약 오류로 거부한다', () => {
    expect(() =>
      mapGazeAnalysisState({
        status: 'AVAILABLE',
        analysis: {
          gazeSessionId: 1,
          gazeAnalysisResultId: 2,
          totalVisitedDurationMs: 100,
          totalVisitedCount: 1.5,
          reverseReadCount: 0,
          avgVisitedDurationMs: 100,
        },
      }),
    ).toThrow('횟수 집계값은 정수여야 합니다.')
    expect(() =>
      mapGazeAnalysisState({
        gazeAnalysisId: 1,
        totalDwellTime: 100,
      } as never),
    ).toThrow('지원하지 않는 상태입니다')
  })

  it('지속 시간·평균·횟수를 표시 규칙에 맞게 포맷한다', () => {
    expect(formatGazeDuration(42_400)).toBe('42.4초')
    expect(formatGazeDuration(62_340)).toBe('1분 2.34초')
    expect(formatGazeAverage(624)).toBe('0.62초')
    expect(formatGazeAverage(null)).toBe('-')
    expect(formatGazeCount(7)).toBe('7회')
  })
})

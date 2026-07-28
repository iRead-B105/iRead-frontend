import type { GazeAnalysisDetail, GazeAnalysisState, GazeAnalysisStatus } from './model'

interface GazeAnalysisDetailDto {
  readonly gazeSessionId: number
  readonly gazeAnalysisResultId: number
  readonly totalVisitedDurationMs: number
  readonly totalVisitedCount: number
  readonly reverseReadCount: number
  readonly avgVisitedDurationMs: number | null
}

export interface GazeAnalysisStateDto {
  readonly status: GazeAnalysisStatus
  readonly analysis: GazeAnalysisDetailDto | null
}

function assertPositiveInteger(value: unknown, field: string): asserts value is number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    throw new TypeError(`[시선 분석 API] ${field}은 양의 정수여야 합니다.`)
  }
}

function assertNonNegativeNumber(value: unknown, field: string): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`[시선 분석 API] ${field}은 0 이상의 유한한 수여야 합니다.`)
  }
}

function mapDetail(dto: GazeAnalysisDetailDto): GazeAnalysisDetail {
  assertPositiveInteger(dto.gazeSessionId, 'gazeSessionId')
  assertPositiveInteger(dto.gazeAnalysisResultId, 'gazeAnalysisResultId')
  assertNonNegativeNumber(dto.totalVisitedDurationMs, 'totalVisitedDurationMs')
  assertNonNegativeNumber(dto.totalVisitedCount, 'totalVisitedCount')
  assertNonNegativeNumber(dto.reverseReadCount, 'reverseReadCount')
  if (dto.avgVisitedDurationMs !== null) {
    assertNonNegativeNumber(dto.avgVisitedDurationMs, 'avgVisitedDurationMs')
  }
  if (!Number.isInteger(dto.totalVisitedCount) || !Number.isInteger(dto.reverseReadCount)) {
    throw new TypeError('[시선 분석 API] 횟수 집계값은 정수여야 합니다.')
  }
  return { ...dto }
}

export function mapGazeAnalysisState(dto: GazeAnalysisStateDto): GazeAnalysisState {
  if (dto.status === 'AVAILABLE') {
    if (dto.analysis === null) {
      throw new TypeError('[시선 분석 API] AVAILABLE 상태에는 analysis가 필요합니다.')
    }
    return {
      status: 'AVAILABLE',
      analysis: mapDetail(dto.analysis),
    }
  }
  if (dto.status === 'NO_DATA' || dto.status === 'FAILED') {
    if (dto.analysis !== null) {
      throw new TypeError(`[시선 분석 API] ${dto.status} 상태의 analysis는 null이어야 합니다.`)
    }
    return {
      status: dto.status,
      analysis: null,
    }
  }
  throw new TypeError(`[시선 분석 API] 지원하지 않는 상태입니다: ${String(dto.status)}`)
}

import type {
  GazeAnalysisDetail,
  GazeAnalysisReplay,
  GazeAnalysisState,
  GazeAnalysisStatus,
  GazeReplaySample,
  GazeReplayWord,
} from './model'

interface GazeAnalysisDetailDto {
  readonly gazeSessionId: number
  readonly gazeAnalysisResultId: number
  readonly totalVisitedDurationMs: number
  readonly totalVisitedCount: number
  readonly reverseReadCount: number
  readonly avgVisitedDurationMs: number | null
  readonly replay?: RawGazeReplayDto | null
}

export interface GazeAnalysisStateDto {
  readonly status: GazeAnalysisStatus
  readonly analysis: GazeAnalysisDetailDto | null
}

export interface RawGazeAnalysisDto {
  readonly gazeSessionId: number
  readonly gazeAnalysisId: number
  readonly totalDwellTime: number
  readonly dwellCount: number
  readonly regressionCount: number
  readonly averageFixationTime: number | null
  readonly replay?: RawGazeReplayDto | null
}

interface RawGazeReplayDto {
  readonly words?: readonly Partial<GazeReplayWord>[]
  readonly samples?: readonly Partial<GazeReplaySample>[]
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
  return { ...dto, replay: mapReplay(dto.replay) }
}

function nullableInteger(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function nonNegativeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function bool(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function mapReplay(dto: RawGazeReplayDto | null | undefined): GazeAnalysisReplay | null {
  if (!dto) return null
  const words = Array.isArray(dto.words)
    ? dto.words.map((word): GazeReplayWord => ({
      questionNo: nullableInteger(word.questionNo),
      targetIndex: nullableInteger(word.targetIndex),
      tokenIndex: nullableInteger(word.tokenIndex),
      text: text(word.text),
      dwellMs: nonNegativeNumber(word.dwellMs),
      visitCount: nonNegativeNumber(word.visitCount),
      skipped: bool(word.skipped),
      regressionCount: nonNegativeNumber(word.regressionCount),
      firstSeenMs: nullableInteger(word.firstSeenMs),
      lastSeenMs: nullableInteger(word.lastSeenMs),
    }))
    : []
  const samples = Array.isArray(dto.samples)
    ? dto.samples.map((sample): GazeReplaySample => ({
      x: nullableNumber(sample.x),
      y: nullableNumber(sample.y),
      capturedAtMs: nullableInteger(sample.capturedAtMs),
      questionNumber: nullableInteger(sample.questionNumber),
      targetIndex: nullableInteger(sample.targetIndex),
      tokenIndex: nullableInteger(sample.tokenIndex),
      text: text(sample.text),
    }))
    : []
  return words.length > 0 || samples.length > 0 ? { words, samples } : null
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

export function mapRawGazeAnalysis(dto: RawGazeAnalysisDto): GazeAnalysisState {
  return mapGazeAnalysisState({
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: dto.gazeSessionId,
      gazeAnalysisResultId: dto.gazeAnalysisId,
      totalVisitedDurationMs: dto.totalDwellTime,
      totalVisitedCount: dto.dwellCount,
      reverseReadCount: dto.regressionCount,
      avgVisitedDurationMs: dto.averageFixationTime,
      replay: dto.replay ?? null,
    },
  })
}

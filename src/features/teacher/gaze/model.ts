export type GazeAnalysisStatus = 'AVAILABLE' | 'NO_DATA' | 'FAILED'
export type GazeAnalysisRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GazeAnalysisDetail {
  readonly gazeSessionId: number
  readonly gazeAnalysisResultId: number
  readonly totalVisitedDurationMs: number
  readonly totalVisitedCount: number
  readonly reverseReadCount: number
  readonly avgVisitedDurationMs: number | null
}

export type GazeAnalysisState =
  | {
      readonly status: 'AVAILABLE'
      readonly analysis: GazeAnalysisDetail
    }
  | {
      readonly status: 'NO_DATA' | 'FAILED'
      readonly analysis: null
    }

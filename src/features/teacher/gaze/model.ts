export type GazeAnalysisStatus = 'AVAILABLE' | 'NO_DATA' | 'FAILED'
export type GazeAnalysisRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export interface GazeReplayWord {
  readonly questionNo: number | null
  readonly targetIndex: number | null
  readonly tokenIndex: number | null
  readonly text: string
  readonly dwellMs: number
  readonly visitCount: number
  readonly skipped: boolean
  readonly regressionCount: number
  readonly firstSeenMs: number | null
  readonly lastSeenMs: number | null
}

export interface GazeReplaySample {
  readonly x: number | null
  readonly y: number | null
  readonly capturedAtMs: number | null
  readonly questionNumber: number | null
  readonly targetIndex: number | null
  readonly tokenIndex: number | null
  readonly text: string
}

export interface GazeAnalysisReplay {
  readonly words: readonly GazeReplayWord[]
  readonly samples: readonly GazeReplaySample[]
}

export interface GazeAnalysisDetail {
  readonly gazeSessionId: number
  readonly gazeAnalysisResultId: number
  readonly totalVisitedDurationMs: number
  readonly totalVisitedCount: number
  readonly reverseReadCount: number
  readonly avgVisitedDurationMs: number | null
  readonly replay?: GazeAnalysisReplay | null
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

import type { GazeAnalysisState } from './model'

export const trainingGazeFixtures: Readonly<Record<number, GazeAnalysisState>> = {
  901: {
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: 6_101,
      gazeAnalysisResultId: 7_101,
      totalVisitedDurationMs: 42_400,
      totalVisitedCount: 68,
      reverseReadCount: 7,
      avgVisitedDurationMs: 624,
    },
  },
  902: { status: 'NO_DATA', analysis: null },
  903: { status: 'FAILED', analysis: null },
  891: {
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: 6_091,
      gazeAnalysisResultId: 7_091,
      totalVisitedDurationMs: 28_100,
      totalVisitedCount: 44,
      reverseReadCount: 3,
      avgVisitedDurationMs: null,
    },
  },
  801: { status: 'NO_DATA', analysis: null },
}

export const testGazeFixtures: Readonly<Record<number, GazeAnalysisState>> = {
  1_011: {
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: 6_201,
      gazeAnalysisResultId: 7_201,
      totalVisitedDurationMs: 51_200,
      totalVisitedCount: 82,
      reverseReadCount: 9,
      avgVisitedDurationMs: 624,
    },
  },
  1_008: { status: 'NO_DATA', analysis: null },
  1_005: { status: 'FAILED', analysis: null },
  1_004: {
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: 6_204,
      gazeAnalysisResultId: 7_204,
      totalVisitedDurationMs: 0,
      totalVisitedCount: 0,
      reverseReadCount: 0,
      avgVisitedDurationMs: 0,
    },
  },
  2_001: { status: 'NO_DATA', analysis: null },
  4_002: { status: 'FAILED', analysis: null },
  4_001: { status: 'NO_DATA', analysis: null },
  5_001: {
    status: 'AVAILABLE',
    analysis: {
      gazeSessionId: 6_501,
      gazeAnalysisResultId: 7_501,
      totalVisitedDurationMs: 65_250,
      totalVisitedCount: 96,
      reverseReadCount: 6,
      avgVisitedDurationMs: 680,
    },
  },
}

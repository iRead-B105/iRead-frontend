export const MOCK_DEMO_REFERENCE_TIME = '2026-07-28T09:00:00+09:00'

export function createMockDemoDate(): Date {
  return new Date(MOCK_DEMO_REFERENCE_TIME)
}

export const mockDemoScenario = {
  teacher: {
    email: 'teacher@example.com',
  },
  student: {
    primaryId: 1,
    primaryName: '김하늘',
    emptyStateId: 3,
  },
  curriculum: {
    currentId: 201,
  },
  training: {
    availableGazeId: 901,
    noDataGazeId: 902,
    failedGazeId: 903,
  },
  test: {
    currentId: 1_011,
    comparisonId: 1_008,
    failedGazeId: 1_005,
  },
  report: {
    primaryId: 1002,
    noDataAndFailedId: 1001,
  },
} as const

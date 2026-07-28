import type {
  GazeMetricChange,
  ReportDetail,
  ReportGazePoint,
  ReportGazeSeries,
  ReportGazeTrend,
  ReportSnapshot,
} from './model'

function metricChange(first: number | null, latest: number | null): GazeMetricChange {
  return {
    first,
    latest,
    delta: first === null || latest === null ? null : latest - first,
  }
}

function buildChanges(
  points: readonly ReportGazePoint[],
): ReportGazeSeries['changes'] {
  const first = points[0]
  const latest = points.at(-1)
  if (!first || !latest || points.length < 2) return null
  return {
    totalVisitedDurationMs: metricChange(
      first.totalVisitedDurationMs,
      latest.totalVisitedDurationMs,
    ),
    totalVisitedCount: metricChange(first.totalVisitedCount, latest.totalVisitedCount),
    reverseReadCount: metricChange(first.reverseReadCount, latest.reverseReadCount),
    avgVisitedDurationMs: metricChange(
      first.avgVisitedDurationMs,
      latest.avgVisitedDurationMs,
    ),
  }
}

function availableSeries(
  points: readonly ReportGazePoint[],
  descriptions: readonly string[],
  failedSessionCount = 0,
): ReportGazeSeries {
  return {
    status: 'AVAILABLE',
    comparisonAvailable: points.length >= 2,
    points,
    changes: buildChanges(points),
    descriptions,
    failedSessionCount,
  }
}

export const emptyReportGazeSeries: ReportGazeSeries = {
  status: 'NO_DATA',
  comparisonAvailable: false,
  points: [],
  changes: null,
  descriptions: [],
  failedSessionCount: 0,
}

const trainingPoints: readonly ReportGazePoint[] = [
  {
    gazeAnalysisResultId: 7101,
    gazeSessionId: 6101,
    sourceType: 'TRAINING',
    sourceId: 1101,
    analyzedAt: '2026-07-03T10:15:00+09:00',
    totalVisitedDurationMs: 42_400,
    totalVisitedCount: 68,
    reverseReadCount: 7,
    avgVisitedDurationMs: 624,
  },
  {
    gazeAnalysisResultId: 7102,
    gazeSessionId: 6102,
    sourceType: 'TRAINING',
    sourceId: 1102,
    analyzedAt: '2026-07-12T11:20:00+09:00',
    totalVisitedDurationMs: 39_100,
    totalVisitedCount: 64,
    reverseReadCount: 6,
    avgVisitedDurationMs: 611,
  },
  {
    gazeAnalysisResultId: 7103,
    gazeSessionId: 6103,
    sourceType: 'TRAINING',
    sourceId: 1103,
    analyzedAt: '2026-07-24T14:05:00+09:00',
    totalVisitedDurationMs: 35_800,
    totalVisitedCount: 59,
    reverseReadCount: 5,
    avgVisitedDurationMs: 607,
  },
]

const testPoints: readonly ReportGazePoint[] = [
  {
    gazeAnalysisResultId: 7201,
    gazeSessionId: 6201,
    sourceType: 'TEST',
    sourceId: 2101,
    analyzedAt: '2026-07-20T09:30:00+09:00',
    totalVisitedDurationMs: 51_200,
    totalVisitedCount: 82,
    reverseReadCount: 9,
    avgVisitedDurationMs: 624,
  },
]

export const reportGazeTrendFixture: ReportGazeTrend = {
  generatedAt: '2026-07-27T15:10:00+09:00',
  training: availableSeries(
    trainingPoints,
    [
      '총 체류 시간은 42.4초에서 35.8초로 6.6초 감소했습니다.',
      '되돌아보기 횟수는 7회에서 5회로 2회 감소했습니다.',
    ],
    1,
  ),
  test: availableSeries(testPoints, []),
}

export const refreshedReportGazeTrendFixture: ReportGazeTrend = {
  generatedAt: '2026-07-28T09:30:00+09:00',
  training: availableSeries(
    [
      ...trainingPoints,
      {
        gazeAnalysisResultId: 7104,
        gazeSessionId: 6104,
        sourceType: 'TRAINING',
        sourceId: 1104,
        analyzedAt: '2026-07-27T09:10:00+09:00',
        totalVisitedDurationMs: 34_900,
        totalVisitedCount: 58,
        reverseReadCount: 5,
        avgVisitedDurationMs: 602,
      },
    ],
    [
      '총 체류 시간은 42.4초에서 34.9초로 7.5초 감소했습니다.',
      '되돌아보기 횟수는 7회에서 5회로 2회 감소했습니다.',
    ],
    1,
  ),
  test: availableSeries(testPoints, []),
}

export const reportSnapshotFixture: ReportSnapshot = {
  learningDays: 12,
  totalTrainingTimeMinutes: 485,
  completedTrainingCount: 18,
  averageAccuracy: 84.5,
  averageReadingSpeed: 72.4,
  readingSpeedUnit: 'CORRECT_WORDS_PER_MINUTE',
  growthHistory: [
    {
      date: '2026-07-03',
      accuracy: 72,
      readingSpeed: 61,
      pronunciationScore: 70,
    },
    {
      date: '2026-07-12',
      accuracy: 79,
      readingSpeed: 67,
      pronunciationScore: 76,
    },
    {
      date: '2026-07-24',
      accuracy: 86,
      readingSpeed: 74,
      pronunciationScore: 82,
    },
  ],
  areaAchievements: [
    { area: '음운 인식', achievement: 86 },
    { area: '파닉스', achievement: 82 },
    { area: '유창성', achievement: 78 },
    { area: '이해력', achievement: null },
  ],
  frequentlyIncorrectWords: [
    {
      wordId: 3101,
      wordName: '읽었습니다',
      attemptCount: 8,
      incorrectCount: 3,
      incorrectRate: 37.5,
    },
    {
      wordId: 3102,
      wordName: '맑았습니다',
      attemptCount: 6,
      incorrectCount: 2,
      incorrectRate: 33.33,
    },
  ],
  improvedPatterns: ['받침이 있는 두 음절 낱말 읽기'],
  persistentDifficultyPatterns: ['긴 문장에서 조사와 어미를 이어 읽기'],
  gazeTrend: reportGazeTrendFixture,
}

export const reportFixtures: readonly ReportDetail[] = [
  {
    reportId: 1002,
    studentId: 1,
    startDate: '2026-07-01',
    endDate: '2026-07-27',
    createdAt: '2026-07-27T15:10:00+09:00',
    snapshot: reportSnapshotFixture,
    teacherMemo:
      '선택 기간 동안 완료한 학습 기록을 바탕으로 다음 훈련 계획을 조정할 예정입니다.',
  },
  {
    reportId: 1001,
    studentId: 1,
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    createdAt: '2026-07-01T09:20:00+09:00',
    snapshot: {
      ...reportSnapshotFixture,
      learningDays: 6,
      totalTrainingTimeMinutes: 210,
      completedTrainingCount: 8,
      averageAccuracy: null,
      averageReadingSpeed: null,
      readingSpeedUnit: null,
      growthHistory: [],
      areaAchievements: [],
      frequentlyIncorrectWords: [],
      improvedPatterns: [],
      persistentDifficultyPatterns: [],
      gazeTrend: {
        generatedAt: '2026-07-01T09:20:00+09:00',
        training: emptyReportGazeSeries,
        test: {
          ...emptyReportGazeSeries,
          status: 'FAILED',
          failedSessionCount: 1,
        },
      },
    },
    teacherMemo: null,
  },
  {
    reportId: 2001,
    studentId: 2,
    startDate: '2026-07-01',
    endDate: '2026-07-26',
    createdAt: '2026-07-26T17:40:00+09:00',
    snapshot: {
      ...reportSnapshotFixture,
      gazeTrend: {
        generatedAt: '2026-07-26T17:40:00+09:00',
        training: emptyReportGazeSeries,
        test: emptyReportGazeSeries,
      },
    },
    teacherMemo: null,
  },
]

export const completedLearningDatesByStudentFixture: Readonly<
  Record<number, readonly string[]>
> = {
  1: ['2026-06-10', '2026-06-22', '2026-07-03', '2026-07-12', '2026-07-24'],
  2: ['2026-07-04', '2026-07-16', '2026-07-26'],
  3: [],
}

export function createMockReportSnapshot(
  startDate: string,
  endDate: string,
): ReportSnapshot {
  const growthHistory = reportSnapshotFixture.growthHistory.filter(
    (point) => point.date >= startDate && point.date <= endDate,
  )
  return {
    ...reportSnapshotFixture,
    growthHistory,
    gazeTrend: reportGazeTrendFixture,
  }
}

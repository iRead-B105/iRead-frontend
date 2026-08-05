export type ReportSeriesStatus = 'AVAILABLE' | 'NO_DATA' | 'FAILED'
export type ReportAnalysisStatus = 'AVAILABLE' | 'INSUFFICIENT_DATA' | 'NO_DATA'
export type ReportMetricType = 'ACCURACY' | 'READING_SPEED' | 'PRONUNCIATION_SCORE'
export type ReportChangeDirection = 'INCREASED' | 'DECREASED' | 'UNCHANGED'

export interface ReportMetricChange {
  readonly metric: ReportMetricType
  readonly first: number
  readonly latest: number
  readonly delta: number
  readonly direction: ReportChangeDirection
}

export interface ReportAutomaticAnalysis {
  readonly status: ReportAnalysisStatus
  readonly metricChanges: readonly ReportMetricChange[]
  readonly descriptions: readonly string[]
}

export interface GrowthHistoryPoint {
  readonly date: string
  readonly accuracy: number | null
  readonly readingSpeed: number | null
  readonly pronunciationScore: number | null
}

export interface AreaAchievement {
  readonly area: string
  readonly achievement: number | null
}

export interface IncorrectWord {
  readonly wordId: number
  readonly wordName: string
  readonly attemptCount: number
  readonly incorrectCount: number
  readonly incorrectRate: number | null
}

export interface GazeMetricChange {
  readonly first: number | null
  readonly latest: number | null
  readonly delta: number | null
}

export interface ReportGazePoint {
  readonly gazeAnalysisResultId: number
  readonly gazeSessionId: number
  readonly sourceType: 'TRAINING' | 'TEST'
  readonly sourceId: number
  readonly analyzedAt: string
  readonly totalVisitedDurationMs: number
  readonly totalVisitedCount: number
  readonly reverseReadCount: number
  readonly avgVisitedDurationMs: number | null
}

export interface ReportGazeChanges {
  readonly totalVisitedDurationMs: GazeMetricChange
  readonly totalVisitedCount: GazeMetricChange
  readonly reverseReadCount: GazeMetricChange
  readonly avgVisitedDurationMs: GazeMetricChange
}

export interface ReportGazeSeries {
  readonly status: ReportSeriesStatus
  readonly comparisonAvailable: boolean
  readonly points: readonly ReportGazePoint[]
  readonly changes: ReportGazeChanges | null
  readonly descriptions: readonly string[]
  readonly failedSessionCount: number
}

export interface ReportGazeTrend {
  readonly generatedAt: string
  readonly training: ReportGazeSeries
  readonly test: ReportGazeSeries
}

export interface ReportSnapshot {
  readonly snapshotVersion: string | null
  readonly calculationVersion: string | null
  readonly learningDays: number
  readonly totalTrainingTimeMinutes: number
  readonly completedTrainingCount: number
  readonly averageAccuracy: number | null
  readonly averageReadingSpeed: number | null
  readonly readingSpeedUnit: string | null
  readonly growthHistory: readonly GrowthHistoryPoint[]
  readonly growthComparisonStatus: ReportAnalysisStatus | null
  readonly automaticAnalysis: ReportAutomaticAnalysis | null
  readonly areaAchievements: readonly AreaAchievement[]
  readonly frequentlyIncorrectWords: readonly IncorrectWord[]
  readonly improvedPatterns: readonly string[]
  readonly persistentDifficultyPatterns: readonly string[]
  readonly gazeTrend: ReportGazeTrend
}

export interface ReportListItem {
  readonly reportId: number
  readonly studentId: number
  readonly startDate: string
  readonly endDate: string
  readonly createdAt: string
}

export interface ReportDetail extends ReportListItem {
  readonly snapshot: ReportSnapshot
  readonly teacherMemo: string | null
}

export interface CreateReportInput {
  readonly studentId: number
  readonly startDate: string
  readonly endDate: string
}

export interface CreateReportResult {
  readonly reportId: number
  readonly createdAt: string
}

export interface UpdateReportMemoResult {
  readonly reportId: number
  readonly teacherMemo: string | null
  readonly createdAt: string
}

export interface RefreshReportGazeResult {
  readonly reportId: number
}

export type ReportRequestStatus = 'idle' | 'loading' | 'ready' | 'error'
export type ReportCreateStatus = 'idle' | 'submitting' | 'error'
export type ReportMemoStatus = 'idle' | 'saving' | 'saved' | 'error'
export type ReportGazeRefreshStatus = 'idle' | 'refreshing' | 'error'

export type TrainingTemplateId = number
export type TrainingInstanceId = number
export type CurriculumId = number

export type CurriculumStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type TrainingStatus = 'NOT_READY' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type TrainingRequestStatus = 'idle' | 'loading' | 'success' | 'error'
export type TrainingPeriod = '30d' | '3m'
export type TrainingExportFormat = 'CSV' | 'JSON'

export type TrainingForm = Readonly<Record<string, unknown>>
export type GeneratedTrainingData = Readonly<Record<string, unknown>>
export type LessonMaterialData = Readonly<Record<string, unknown>>

export interface TrainingCatalogItem {
  readonly trainingTemplateId: TrainingTemplateId
  readonly unitName: string
  readonly sequence: number
  readonly trainingName: string
  readonly studentAchievementRate: number | null
  readonly form: TrainingForm | null
}

export interface CurriculumTraining {
  readonly trainingId: TrainingInstanceId
  readonly trainingTemplateId: TrainingTemplateId
  readonly sequence: number
  readonly unitName: string
  readonly trainingName: string
  readonly status: TrainingStatus
}

export interface DailyCurriculum {
  readonly curriculumId: CurriculumId
  readonly status: CurriculumStatus
  readonly trainings: readonly CurriculumTraining[]
}

export interface SaveCurriculumRequest {
  /**
   * Array order is execution order and duplicate values represent repeated attempts.
   */
  readonly trainingTemplateIds: readonly TrainingTemplateId[]
}

export interface ExpectedWord {
  readonly wordId: number
  readonly wordName: string
}

export interface TrainingDetail {
  readonly trainingId: TrainingInstanceId
  readonly trainingTemplateId: TrainingTemplateId
  readonly name: string
  readonly form: TrainingForm | null
  readonly generatedData: GeneratedTrainingData | null
  readonly status: TrainingStatus
  readonly startedAt: string | null
  readonly finishedAt: string | null
  readonly result: TrainingResult | null
  readonly accuracy: number | null
}

export interface LessonMaterialPresentation {
  readonly activityName: string
  readonly instruction: string
  readonly hint: string
  readonly correctFeedback: string
  readonly retryFeedback: string
}

export interface LessonMaterialItem {
  readonly questionNo: number
  readonly questionType: string
  readonly responseType: string
  readonly requiredInputs: readonly string[]
  readonly presentation: LessonMaterialPresentation
  readonly content: LessonMaterialData
  readonly answer: LessonMaterialData
}

export interface EditableLessonMaterialItem {
  readonly questionNo: number
  readonly questionType: string
  readonly presentation: LessonMaterialPresentation
  readonly content: LessonMaterialData
  readonly answer: LessonMaterialData
}

export interface LessonMaterialDocument {
  readonly trainingId: TrainingInstanceId
  readonly trainingTemplateId: TrainingTemplateId
  readonly trainingName: string
  readonly unitName: string
  readonly status: TrainingStatus
  readonly schemaVersion: number
  readonly revision: number
  readonly editable: boolean
  readonly materials: readonly LessonMaterialItem[]
}

export interface SaveLessonMaterialRequest {
  readonly revision: number
  readonly materials: readonly EditableLessonMaterialItem[]
}

export interface SavedLessonMaterial {
  readonly trainingId: TrainingInstanceId
  readonly revision: number
  readonly savedAt: string
  readonly source: 'MANUAL'
  readonly materials: readonly LessonMaterialItem[]
}

export interface TrainingQuestionResult {
  readonly questionNumber: number
  readonly question: string | null
  readonly isCorrect: boolean | null
  readonly selectedAnswer: string | null
  readonly correctAnswer: string | null
}

export interface TrainingResult {
  readonly questions?: readonly TrainingQuestionResult[]
  readonly learningAssessment?: string | null
  readonly [key: string]: unknown
}

export interface CurriculumLogTraining {
  readonly trainingId: TrainingInstanceId
  readonly unitName: string
  readonly trainingName: string
}

export interface CurriculumLog {
  readonly curriculumId: CurriculumId
  readonly date: string
  readonly achievement: number | null
  readonly trainings: readonly CurriculumLogTraining[]
}

export interface CurriculumTrainingLogItem {
  readonly trainingId: TrainingInstanceId
  readonly trainingName: string
  readonly startedAt: string | null
  readonly finishedAt: string | null
  readonly accuracy: number | null
  readonly questions: readonly TrainingQuestionResult[]
}

export interface CurriculumTrainingLog {
  readonly curriculumId: CurriculumId
  readonly trainings: readonly CurriculumTrainingLogItem[]
}

export interface AccuracyComparison {
  readonly trainingId: TrainingInstanceId
  readonly trainingName: string
  readonly date: string | null
  readonly accuracy: number | null
  readonly previousTrainingDate: string | null
  readonly previousAccuracy: number | null
}

export interface ReadingSpeedPoint {
  readonly trainingId?: TrainingInstanceId
  readonly date: string
  readonly speed: number
}

export interface TrainingStatistics {
  readonly accuracyComparisons: readonly AccuracyComparison[]
  readonly readingSpeedTrend: {
    readonly unit: 'CORRECT_WORDS_PER_MINUTE'
    readonly changeRate: number | null
    readonly points: readonly ReadingSpeedPoint[]
  }
}

export interface TrainingDownload {
  readonly blob: Blob
  readonly fileName?: string
  readonly contentType: string
}

export interface CurriculumDraftItem {
  readonly key: string
  readonly trainingTemplateId: TrainingTemplateId
  readonly trainingId: TrainingInstanceId | null
}

export interface TrainingPreviewItem {
  readonly id: string
  readonly label: string
  readonly content: string
  readonly answer: string | null
}

export interface TrainingPreview {
  readonly source: 'generated' | 'template' | 'empty'
  readonly title: string
  readonly description: string
  readonly items: readonly TrainingPreviewItem[]
}

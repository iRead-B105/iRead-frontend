export type TrainingTemplateId = number
export type TrainingInstanceId = number
export type CurriculumId = number

export type CurriculumStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type TrainingStatus = 'NOT_READY' | 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type TrainingRequestStatus = 'idle' | 'loading' | 'success' | 'error'

export type TrainingForm = Readonly<Record<string, unknown>>
export type GeneratedTrainingData = Readonly<Record<string, unknown>>

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
   * The API field is named trainingId, but every value is a template identifier.
   * Array order is execution order and duplicate values represent repeated attempts.
   */
  readonly trainingId: readonly TrainingTemplateId[]
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

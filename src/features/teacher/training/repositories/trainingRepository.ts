import type {
  CurriculumLog,
  CurriculumTrainingLog,
  DailyCurriculum,
  ExpectedWord,
  SaveCurriculumRequest,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingDownload,
  TrainingExportFormat,
  TrainingPeriod,
  TrainingStatistics,
} from '../model'

export interface TrainingRequestOptions {
  readonly signal?: AbortSignal
}

export interface TrainingRepository {
  readonly getCatalog: (
    studentId: number,
    options?: TrainingRequestOptions,
  ) => Promise<readonly TrainingCatalogItem[]>
  readonly getCurrentCurriculum: (
    studentId: number,
    options?: TrainingRequestOptions,
  ) => Promise<DailyCurriculum | null>
  readonly createCurriculum: (
    studentId: number,
    request: SaveCurriculumRequest,
  ) => Promise<DailyCurriculum>
  readonly getCurriculum: (
    studentId: number,
    curriculumId: number,
    options?: TrainingRequestOptions,
  ) => Promise<DailyCurriculum>
  readonly updateCurriculum: (
    studentId: number,
    curriculumId: number,
    request: SaveCurriculumRequest,
  ) => Promise<DailyCurriculum>
  readonly getExpectedWords: (
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ) => Promise<readonly ExpectedWord[]>
  readonly addExpectedWord: (
    studentId: number,
    trainingId: number,
    wordName: string,
  ) => Promise<void>
  readonly deleteExpectedWord: (
    studentId: number,
    trainingId: number,
    wordId: number,
  ) => Promise<void>
  readonly getTrainingDetail: (
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ) => Promise<TrainingDetail>
  readonly getCurriculumLogs: (
    studentId: number,
    period: TrainingPeriod,
    options?: TrainingRequestOptions,
  ) => Promise<readonly CurriculumLog[]>
  readonly getTrainingLog: (
    studentId: number,
    curriculumId: number,
    options?: TrainingRequestOptions,
  ) => Promise<CurriculumTrainingLog>
  readonly getStatistics: (
    studentId: number,
    curriculumId: number,
    period: TrainingPeriod,
    options?: TrainingRequestOptions,
  ) => Promise<TrainingStatistics>
  readonly exportTraining: (
    studentId: number,
    trainingId: number,
    format: TrainingExportFormat,
  ) => Promise<TrainingDownload>
}

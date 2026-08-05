import type {
  CurriculumLog,
  CurriculumReviewResult,
  CurriculumTrainingLog,
  DailyCurriculum,
  GeneratedTrainingData,
  LessonMaterialDocument,
  SaveCurriculumRequest,
  SaveLessonMaterialRequest,
  SavedLessonMaterial,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingDownload,
  TrainingExportFormat,
  TrainingPeriod,
  TrainingStatistics,
} from '../model'
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import { ApiError } from '@/lib/api'

export interface TrainingRequestOptions {
  readonly signal?: AbortSignal
}

export const CURRICULUM_TRAINING_COUNT = 5

export class CurriculumSynchronizationError extends Error {
  readonly saved = true
  readonly originalError: unknown

  constructor(originalError: unknown) {
    super('커리큘럼은 저장됐지만 최신 내용을 다시 불러오지 못했습니다.')
    this.name = 'CurriculumSynchronizationError'
    this.originalError = originalError
  }
}

export function assertSaveCurriculumRequest(
  request: SaveCurriculumRequest,
  validTemplateIds?: ReadonlySet<number>,
): void {
  if (request.trainingTemplateIds.length !== CURRICULUM_TRAINING_COUNT) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_CURRICULUM_SIZE',
      message: `커리큘럼에는 훈련을 정확히 ${CURRICULUM_TRAINING_COUNT}개 선택해야 합니다.`,
    })
  }

  for (const templateId of request.trainingTemplateIds) {
    if (!Number.isInteger(templateId) || templateId <= 0) {
      throw new ApiError({
        status: 400,
        code: 'INVALID_TRAINING_TEMPLATE_ID',
        message: '훈련 템플릿 ID는 양의 정수여야 합니다.',
      })
    }
    if (validTemplateIds && !validTemplateIds.has(templateId)) {
      throw new ApiError({
        status: 400,
        code: 'TRAINING_TEMPLATE_NOT_FOUND',
        message: '존재하지 않는 훈련 템플릿입니다.',
      })
    }
  }
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
  readonly completeCurriculumReview: (
    studentId: number,
    curriculumId: number,
  ) => Promise<CurriculumReviewResult>
  readonly generateTraining: (
    studentId: number,
    trainingId: number,
  ) => Promise<GeneratedTrainingData>
  readonly getTrainingDetail: (
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ) => Promise<TrainingDetail>
  readonly getLessonMaterial: (
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ) => Promise<LessonMaterialDocument>
  readonly saveLessonMaterial: (
    studentId: number,
    trainingId: number,
    request: SaveLessonMaterialRequest,
  ) => Promise<SavedLessonMaterial>
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
    options?: TrainingRequestOptions,
  ) => Promise<TrainingStatistics>
  readonly getGazeAnalysis: (
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ) => Promise<GazeAnalysisState>
  readonly exportTraining: (
    studentId: number,
    trainingId: number,
    format: TrainingExportFormat,
  ) => Promise<TrainingDownload>
}

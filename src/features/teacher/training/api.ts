import { apiRequest, downloadFile, jsonBody } from '@/lib/api'
import { resolveHistoryDateRange } from '@/features/teacher/periodDateRange'
import {
  mapRawGazeAnalysis,
  type GazeAnalysisState,
  type RawGazeAnalysisDto,
} from '@/features/teacher/gaze'
import type {
  CurriculumLog,
  CurriculumTrainingLog,
  CurriculumStatus,
  CurriculumReviewResult,
  CurriculumReviewStatus,
  DailyCurriculum,
  LessonMaterialDocument,
  GeneratedTrainingData,
  SaveCurriculumRequest,
  SaveLessonMaterialRequest,
  SavedLessonMaterial,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingDownload,
  TrainingExportFormat,
  TrainingForm,
  TrainingPeriod,
  TrainingResult,
  TrainingStatus,
  TrainingStatistics,
} from './model'
import type { TrainingRequestOptions } from './repositories/trainingRepository'

export type TrainingApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>
export type TrainingApiDownloadRequest = (
  endpoint: string,
  init?: RequestInit,
) => Promise<TrainingDownload>

interface TrainingCatalogItemDto {
  readonly trainingId: number
  readonly category: string
  readonly sequence: number
  readonly trainingName: string
  readonly studentAchievementRate: number | null
  readonly form?: TrainingForm | null
}

interface TrainingCatalogDto {
  readonly trainingTypes: readonly TrainingCatalogItemDto[]
}

interface CurriculumTrainingDto {
  readonly trainingId: number
  readonly trainingTemplateId: number
  readonly sequence: number
  readonly unitName: string
  readonly trainingName: string
  readonly status: TrainingStatus
}

interface DailyCurriculumDto {
  readonly curriculumId: number
  readonly status: CurriculumStatus
  readonly sourceTestCurriculumId?: string | null
  readonly reviewStatus?: CurriculumReviewStatus | null
  readonly reviewedByTeacherId?: number | null
  readonly reviewedAt?: string | null
  readonly trainings: readonly CurriculumTrainingDto[]
}

interface CurriculumReviewResultDto {
  readonly curriculumId: number
  readonly reviewStatus: CurriculumReviewStatus
  readonly reviewedByTeacherId?: number | null
  readonly reviewedAt?: string | null
}

interface TrainingDetailDto {
  readonly trainingId: number
  readonly trainingTemplateId: number
  readonly name: string
  readonly form: TrainingForm | null
  readonly generatedData?: Readonly<Record<string, unknown>> | null
  readonly status: TrainingStatus | Lowercase<TrainingStatus>
  readonly startedAt?: string | null
  readonly finishedAt?: string | null
  readonly result?: TrainingResult | null
  readonly accuracy?: number | null
}

interface CurriculumLogDto {
  readonly curriculumId: number
  readonly date: string
  readonly achievementRate: number | null
  readonly trainings: readonly {
    readonly trainingId: number
    readonly unitName: string
    readonly trainingName: string
  }[]
}

interface CurriculumTrainingLogDto {
  readonly trainings: readonly {
    readonly trainingId: number
    readonly trainingName: string
    readonly startedAt: string | null
    readonly endedAt: string | null
    readonly accuracyRate: number | null
    readonly questionResults: readonly {
      readonly questionNumber: number
      readonly isCorrect: boolean | null
    }[]
    readonly incorrectItems: readonly {
      readonly questionNumber: number
      readonly question: string
      readonly correctAnswer: string
      readonly selectedAnswer: string
    }[]
  }[]
}

interface TrainingStatisticsDto {
  readonly trainings: readonly {
    readonly trainingId: number
    readonly trainingName: string
    readonly date: string | null
    readonly accuracyRate: number | null
    readonly previousTrainingDate: string | null
    readonly previousAccuracyRate: number | null
  }[]
}

interface ReadingSpeedTrendDto {
  readonly unit: 'WORDS_PER_MINUTE'
  readonly voiceChangeRate: number | null
  readonly points: readonly {
    readonly date: string
    readonly voiceSpeed: number | null
  }[]
}

function requestInit(options?: TrainingRequestOptions): RequestInit {
  return options?.signal ? { signal: options.signal } : {}
}

function mapCatalogItem(dto: TrainingCatalogItemDto): TrainingCatalogItem {
  return {
    trainingTemplateId: dto.trainingId,
    unitName: dto.category,
    sequence: dto.sequence,
    trainingName: dto.trainingName,
    studentAchievementRate: dto.studentAchievementRate,
    form: dto.form ?? null,
  }
}

function mapCurriculum(dto: DailyCurriculumDto): DailyCurriculum {
  return {
    curriculumId: dto.curriculumId,
    status: dto.status,
    sourceTestCurriculumId: dto.sourceTestCurriculumId ?? null,
    reviewStatus: dto.reviewStatus ?? 'NOT_REQUIRED',
    reviewedByTeacherId: dto.reviewedByTeacherId ?? null,
    reviewedAt: dto.reviewedAt ?? null,
    trainings: [...dto.trainings]
      .sort((left, right) => left.sequence - right.sequence)
      .map((training) => ({ ...training })),
  }
}

function normalizeTrainingStatus(
  status: TrainingStatus | Lowercase<TrainingStatus>,
): TrainingStatus {
  const normalized = status.toUpperCase()
  if (
    normalized === 'NOT_READY' ||
    normalized === 'NOT_STARTED' ||
    normalized === 'IN_PROGRESS' ||
    normalized === 'COMPLETED'
  ) {
    return normalized
  }
  throw new Error(`지원하지 않는 훈련 상태입니다: ${status}`)
}

function mapTrainingDetail(dto: TrainingDetailDto): TrainingDetail {
  return {
    trainingId: dto.trainingId,
    trainingTemplateId: dto.trainingTemplateId,
    name: dto.name,
    form: dto.form,
    generatedData: dto.generatedData ?? null,
    status: normalizeTrainingStatus(dto.status),
    startedAt: dto.startedAt ?? null,
    finishedAt: dto.finishedAt ?? null,
    result: dto.result ?? null,
    accuracy: dto.accuracy ?? null,
  }
}

function mapCurriculumLog(dto: CurriculumLogDto): CurriculumLog {
  return {
    curriculumId: dto.curriculumId,
    date: dto.date,
    achievement: dto.achievementRate,
    trainings: dto.trainings.map((training) => ({ ...training })),
  }
}

function mapTrainingLog(
  curriculumId: number,
  dto: CurriculumTrainingLogDto,
): CurriculumTrainingLog {
  return {
    curriculumId,
    trainings: dto.trainings.map((training) => {
      const incorrectByQuestion = new Map(
        training.incorrectItems.map((item) => [item.questionNumber, item]),
      )
      return {
        trainingId: training.trainingId,
        trainingName: training.trainingName,
        startedAt: training.startedAt,
        finishedAt: training.endedAt,
        accuracy: training.accuracyRate,
        questions: training.questionResults.map((result) => {
          const incorrect = incorrectByQuestion.get(result.questionNumber)
          return {
            questionNumber: result.questionNumber,
            question: incorrect?.question ?? null,
            isCorrect: result.isCorrect,
            selectedAnswer: incorrect?.selectedAnswer ?? null,
            correctAnswer: incorrect?.correctAnswer ?? null,
          }
        }),
      }
    }),
  }
}

function mapStatistics(
  statistics: TrainingStatisticsDto,
  readingSpeed: ReadingSpeedTrendDto,
): TrainingStatistics {
  return {
    accuracyComparisons: statistics.trainings.map((training) => ({
      trainingId: training.trainingId,
      trainingName: training.trainingName,
      date: training.date,
      accuracy: training.accuracyRate,
      previousTrainingDate: training.previousTrainingDate,
      previousAccuracy: training.previousAccuracyRate,
    })),
    readingSpeedTrend: {
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: readingSpeed.voiceChangeRate,
      points: readingSpeed.points
        .filter(
          (point): point is { readonly date: string; readonly voiceSpeed: number } =>
            point.voiceSpeed !== null,
        )
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((point) => ({ date: point.date, speed: point.voiceSpeed })),
    },
  }
}

export interface TrainingApi {
  readonly getCatalog: (
    studentId: number,
    options?: TrainingRequestOptions,
  ) => Promise<readonly TrainingCatalogItem[]>
  readonly getCurrentCurriculum: (
    studentId: number,
    options?: TrainingRequestOptions,
  ) => Promise<DailyCurriculum>
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
  ) => Promise<void>
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
    command: SaveLessonMaterialRequest,
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
    period: TrainingPeriod,
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

export function createTrainingApi(
  request: TrainingApiRequest = apiRequest,
  download: TrainingApiDownloadRequest = downloadFile,
  now: () => Date = () => new Date(),
): TrainingApi {
  return {
    async getCatalog(studentId, options) {
      const dto = await request<TrainingCatalogDto>(
        `/api/admin/training/${studentId}`,
        requestInit(options),
      )
      return dto.trainingTypes.map(mapCatalogItem)
    },
    async getCurrentCurriculum(studentId, options) {
      const dto = await request<DailyCurriculumDto>(
        `/api/admin/training/${studentId}/current`,
        requestInit(options),
      )
      return mapCurriculum(dto)
    },
    async createCurriculum(studentId, command) {
      const dto = await request<DailyCurriculumDto>(`/api/admin/training/${studentId}/curriculum`, {
        method: 'POST',
        body: jsonBody(command),
      })
      return mapCurriculum(dto)
    },
    async getCurriculum(studentId, curriculumId, options) {
      const dto = await request<DailyCurriculumDto>(
        `/api/admin/training/${studentId}/${curriculumId}`,
        requestInit(options),
      )
      return mapCurriculum(dto)
    },
    async updateCurriculum(studentId, curriculumId, command) {
      await request<void>(`/api/admin/training/${studentId}/${curriculumId}`, {
        method: 'PATCH',
        body: jsonBody(command),
      })
    },
    async completeCurriculumReview(studentId, curriculumId) {
      const dto = await request<CurriculumReviewResultDto>(
        `/api/admin/training/${studentId}/${curriculumId}/review-complete`,
        { method: 'POST' },
      )
      return {
        curriculumId: dto.curriculumId,
        reviewStatus: dto.reviewStatus,
        reviewedByTeacherId: dto.reviewedByTeacherId ?? null,
        reviewedAt: dto.reviewedAt ?? null,
      }
    },
    async generateTraining(studentId, trainingId) {
      return request<GeneratedTrainingData>(
        `/api/admin/training/${studentId}/${trainingId}/generate`,
        { method: 'POST' },
      )
    },
    async getTrainingDetail(studentId, trainingId, options) {
      const dto = await request<TrainingDetailDto>(
        `/api/admin/training/${studentId}/${trainingId}/detail`,
        requestInit(options),
      )
      return mapTrainingDetail(dto)
    },
    async getLessonMaterial(studentId, trainingId, options) {
      return request<LessonMaterialDocument>(
        `/api/admin/training/${studentId}/${trainingId}/lesson-material`,
        requestInit(options),
      )
    },
    async saveLessonMaterial(studentId, trainingId, command) {
      return request<SavedLessonMaterial>(
        `/api/admin/training/${studentId}/${trainingId}/lesson-material`,
        {
          method: 'PUT',
          body: jsonBody(command),
        },
      )
    },
    async getCurriculumLogs(studentId, period, options) {
      const { from, to } = resolveHistoryDateRange(period, now())
      const search = new URLSearchParams({ from, to })
      const dto = await request<readonly CurriculumLogDto[]>(
        `/api/admin/training/${studentId}/curriculum-log?${search}`,
        requestInit(options),
      )
      return [...dto]
        .sort(
          (left, right) =>
            right.date.localeCompare(left.date) || right.curriculumId - left.curriculumId,
        )
        .map(mapCurriculumLog)
    },
    async getTrainingLog(studentId, curriculumId, options) {
      const dto = await request<CurriculumTrainingLogDto>(
        `/api/admin/training/${studentId}/${curriculumId}/training-log`,
        requestInit(options),
      )
      return mapTrainingLog(curriculumId, dto)
    },
    async getStatistics(studentId, curriculumId, period, options) {
      const { from, to } = resolveHistoryDateRange(period, now())
      const search = new URLSearchParams({ from, to })
      const [statistics, readingSpeed] = await Promise.all([
        request<TrainingStatisticsDto>(
          `/api/admin/training/${studentId}/${curriculumId}/statistics`,
          requestInit(options),
        ),
        request<ReadingSpeedTrendDto>(
          `/api/admin/student/${studentId}/reading-speed-trend?${search}`,
          requestInit(options),
        ),
      ])
      return mapStatistics(statistics, readingSpeed)
    },
    async getGazeAnalysis(studentId, trainingId, options) {
      const dto = await request<RawGazeAnalysisDto>(
        `/api/admin/training/${studentId}/${trainingId}/gaze-analysis`,
        requestInit(options),
      )
      return mapRawGazeAnalysis(dto)
    },
    exportTraining(studentId, trainingId, format) {
      return download(`/api/admin/training/${studentId}/${trainingId}/export?format=${format}`, {
        method: 'POST',
      })
    },
  }
}

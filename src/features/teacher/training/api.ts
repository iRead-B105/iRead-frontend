import { apiRequest, downloadFile, jsonBody } from '@/lib/api'
import { resolveHistoryDateRange } from '@/features/teacher/periodDateRange'
import {
  mapGazeAnalysisState,
  type GazeAnalysisState,
  type GazeAnalysisStateDto,
} from '@/features/teacher/gaze'
import type {
  CurriculumLog,
  CurriculumTrainingLog,
  CurriculumStatus,
  DailyCurriculum,
  ExpectedWord,
  SaveCurriculumRequest,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingDownload,
  TrainingExportFormat,
  TrainingForm,
  TrainingPeriod,
  TrainingQuestionResult,
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
  readonly trainings: readonly CurriculumTrainingDto[]
}

interface ExpectedWordDto {
  readonly wordId: number
  readonly word: string
}

interface ExpectedWordsDto {
  readonly words: readonly ExpectedWordDto[]
}

interface TrainingDetailDto {
  readonly trainingId: number
  readonly trainingTemplateId: number
  readonly name: string
  readonly form: TrainingForm | null
  readonly generatedData?: Readonly<Record<string, unknown>> | null
  readonly status: TrainingStatus
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
  readonly curriculumId: number
  readonly trainings: readonly {
    readonly trainingId: number
    readonly trainingName: string
    readonly startedAt: string | null
    readonly finishedAt: string | null
    readonly accuracy: number | null
    readonly questions: readonly TrainingQuestionResult[]
  }[]
}

interface TrainingStatisticsDto {
  readonly accuracyComparisons: readonly {
    readonly trainingId: number
    readonly trainingName: string
    readonly date: string | null
    readonly accuracy: number | null
    readonly previousTrainingDate: string | null
    readonly previousAccuracy: number | null
  }[]
  readonly readingSpeedTrend: {
    readonly unit: 'CORRECT_WORDS_PER_MINUTE'
    readonly changeRate: number | null
    readonly points: readonly {
      readonly trainingId: number
      readonly date: string
      readonly speed: number
    }[]
  }
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
    trainings: [...dto.trainings]
      .sort((left, right) => left.sequence - right.sequence)
      .map((training) => ({ ...training })),
  }
}

function mapExpectedWord(dto: ExpectedWordDto): ExpectedWord {
  return {
    wordId: dto.wordId,
    wordName: dto.word,
  }
}

function mapTrainingDetail(dto: TrainingDetailDto): TrainingDetail {
  return {
    trainingId: dto.trainingId,
    trainingTemplateId: dto.trainingTemplateId,
    name: dto.name,
    form: dto.form,
    generatedData: dto.generatedData ?? null,
    status: dto.status,
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

function mapTrainingLog(dto: CurriculumTrainingLogDto): CurriculumTrainingLog {
  return {
    curriculumId: dto.curriculumId,
    trainings: dto.trainings.map((training) => ({
      ...training,
      questions: training.questions.map((question) => ({ ...question })),
    })),
  }
}

function mapStatistics(dto: TrainingStatisticsDto): TrainingStatistics {
  return {
    accuracyComparisons: dto.accuracyComparisons.map((comparison) => ({
      ...comparison,
    })),
    readingSpeedTrend: {
      unit: dto.readingSpeedTrend.unit,
      changeRate: dto.readingSpeedTrend.changeRate,
      points: [...dto.readingSpeedTrend.points]
        .sort((left, right) => left.date.localeCompare(right.date))
        .map((point) => ({ ...point })),
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
      const dto = await request<DailyCurriculumDto>(
        `/api/admin/training/${studentId}/${curriculumId}`,
        {
          method: 'PATCH',
          body: jsonBody(command),
        },
      )
      return mapCurriculum(dto)
    },
    async getExpectedWords(studentId, trainingId, options) {
      const dto = await request<ExpectedWordsDto>(
        `/api/admin/training/${studentId}/${trainingId}/expected-word`,
        requestInit(options),
      )
      return dto.words.map(mapExpectedWord)
    },
    async addExpectedWord(studentId, trainingId, wordName) {
      await request<void>(`/api/admin/training/${studentId}/${trainingId}/expected-word`, {
        method: 'POST',
        body: jsonBody({ wordName }),
      })
    },
    async deleteExpectedWord(studentId, trainingId, wordId) {
      await request<void>(
        `/api/admin/training/${studentId}/${trainingId}/expected-word/${wordId}`,
        { method: 'DELETE' },
      )
    },
    async getTrainingDetail(studentId, trainingId, options) {
      const dto = await request<TrainingDetailDto>(
        `/api/admin/training/${studentId}/${trainingId}/detail`,
        requestInit(options),
      )
      return mapTrainingDetail(dto)
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
      return mapTrainingLog(dto)
    },
    async getStatistics(studentId, curriculumId, period, options) {
      const dto = await request<TrainingStatisticsDto>(
        `/api/admin/training/${studentId}/${curriculumId}/statistics?period=${period}`,
        requestInit(options),
      )
      return mapStatistics(dto)
    },
    async getGazeAnalysis(studentId, trainingId, options) {
      const dto = await request<GazeAnalysisStateDto>(
        `/api/admin/training/${studentId}/${trainingId}/gaze-analysis`,
        requestInit(options),
      )
      return mapGazeAnalysisState(dto)
    },
    exportTraining(studentId, trainingId, format) {
      return download(`/api/admin/training/${studentId}/${trainingId}/export?format=${format}`, {
        method: 'POST',
      })
    },
  }
}

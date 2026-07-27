import { apiRequest, jsonBody } from '@/lib/api'
import type {
  CurriculumStatus,
  DailyCurriculum,
  ExpectedWord,
  SaveCurriculumRequest,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingForm,
  TrainingStatus,
} from './model'
import type { TrainingRequestOptions } from './repositories/trainingRepository'

export type TrainingApiRequest = <T>(endpoint: string, init?: RequestInit) => Promise<T>

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
  readonly form: TrainingForm
  readonly generatedData?: Readonly<Record<string, unknown>> | null
  readonly status: TrainingStatus
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
}

export function createTrainingApi(request: TrainingApiRequest = apiRequest): TrainingApi {
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
      const dto = await request<DailyCurriculumDto>(
        `/api/admin/training/${studentId}/curriculum`,
        {
          method: 'POST',
          body: jsonBody(command),
        },
      )
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
      await request<void>(
        `/api/admin/training/${studentId}/${trainingId}/expected-word`,
        {
          method: 'POST',
          body: jsonBody({ wordName }),
        },
      )
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
  }
}

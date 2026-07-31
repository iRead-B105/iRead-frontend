import { ApiError } from '@/lib/api'
import { trainingGazeFixtures, type GazeAnalysisState } from '@/features/teacher/gaze'
import {
  assertLessonMaterialResponseCount,
  assertSaveLessonMaterialRequest,
  createMockLessonMaterialDocument,
  normalizeSavedMaterials,
} from '../lessonMaterial'
import {
  curriculumLogFixtures,
  currentCurriculumFixture,
  expectedWordFixtures,
  trainingCatalogFixture,
  trainingDetailFixtures,
  trainingLogFixtures,
  trainingStatisticsFixtures,
} from '../fixtures'
import type {
  CurriculumLog,
  CurriculumTraining,
  CurriculumTrainingLog,
  DailyCurriculum,
  ExpectedWord,
  GeneratedTrainingData,
  LessonMaterialDocument,
  SaveCurriculumRequest,
  SaveLessonMaterialRequest,
  SavedLessonMaterial,
  TrainingCatalogItem,
  TrainingDetail,
  TrainingExportFormat,
  TrainingPeriod,
  TrainingStatistics,
} from '../model'
import {
  assertSaveCurriculumRequest,
  type TrainingRepository,
  type TrainingRequestOptions,
} from './trainingRepository'

export interface MockTrainingRepositoryFixtures {
  readonly catalog?: readonly TrainingCatalogItem[]
  readonly curricula?: Readonly<Record<number, DailyCurriculum | null>>
  readonly details?: readonly TrainingDetail[]
  readonly expectedWords?: Readonly<Record<number, readonly ExpectedWord[]>>
  readonly lessonMaterials?: readonly LessonMaterialDocument[]
  readonly curriculumLogs?: Readonly<
    Record<number, Readonly<Record<TrainingPeriod, readonly CurriculumLog[]>>>
  >
  readonly trainingLogs?: Readonly<Record<number, CurriculumTrainingLog>>
  readonly statistics?: Readonly<Record<string, TrainingStatistics>>
  readonly gazeByTrainingId?: Readonly<Record<number, GazeAnalysisState>>
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function assertNotAborted(options?: TrainingRequestOptions): void {
  options?.signal?.throwIfAborted()
}

function assertPositiveId(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_ID',
      message: `${name}은 양의 정수여야 합니다.`,
    })
  }
}

export class MockTrainingRepository implements TrainingRepository {
  private readonly catalog: readonly TrainingCatalogItem[]
  private readonly curricula = new Map<number, DailyCurriculum | null>()
  private readonly details = new Map<number, TrainingDetail>()
  private readonly expectedWords = new Map<number, ExpectedWord[]>()
  private readonly lessonMaterials = new Map<number, LessonMaterialDocument>()
  private readonly curriculumLogs = new Map<
    number,
    Readonly<Record<TrainingPeriod, readonly CurriculumLog[]>>
  >()
  private readonly trainingLogs = new Map<number, CurriculumTrainingLog>()
  private readonly statistics = new Map<string, TrainingStatistics>()
  private readonly gazeByTrainingId = new Map<number, GazeAnalysisState>()
  private nextCurriculumId = 300
  private nextTrainingId = 1_000
  private nextWordId = 10_000

  constructor(fixtures: MockTrainingRepositoryFixtures = {}) {
    this.catalog = clone(fixtures.catalog ?? trainingCatalogFixture)
    const curricula = fixtures.curricula ?? { 1: currentCurriculumFixture }
    for (const [studentId, curriculum] of Object.entries(curricula)) {
      this.curricula.set(Number(studentId), curriculum ? clone(curriculum) : null)
    }
    for (const detail of fixtures.details ?? trainingDetailFixtures) {
      this.details.set(detail.trainingId, clone(detail))
      this.nextTrainingId = Math.max(this.nextTrainingId, detail.trainingId + 1)
    }
    for (const [trainingId, words] of Object.entries(
      fixtures.expectedWords ?? expectedWordFixtures,
    )) {
      const clonedWords = clone(words) as ExpectedWord[]
      this.expectedWords.set(Number(trainingId), clonedWords)
      for (const word of clonedWords) this.nextWordId = Math.max(this.nextWordId, word.wordId + 1)
    }
    for (const document of fixtures.lessonMaterials ?? []) {
      this.lessonMaterials.set(document.trainingId, clone(document))
    }
    for (const [studentId, logs] of Object.entries(
      fixtures.curriculumLogs ?? curriculumLogFixtures,
    )) {
      this.curriculumLogs.set(Number(studentId), clone(logs))
    }
    for (const [curriculumId, log] of Object.entries(
      fixtures.trainingLogs ?? trainingLogFixtures,
    )) {
      this.trainingLogs.set(Number(curriculumId), clone(log))
    }
    for (const [key, statistics] of Object.entries(
      fixtures.statistics ?? trainingStatisticsFixtures,
    )) {
      this.statistics.set(key, clone(statistics))
    }
    for (const [trainingId, gaze] of Object.entries(
      fixtures.gazeByTrainingId ?? trainingGazeFixtures,
    )) {
      this.gazeByTrainingId.set(Number(trainingId), clone(gaze))
    }
  }

  async getCatalog(studentId: number, options?: TrainingRequestOptions) {
    assertPositiveId(studentId, 'studentId')
    assertNotAborted(options)
    return clone(this.catalog)
  }

  async getCurrentCurriculum(studentId: number, options?: TrainingRequestOptions) {
    assertPositiveId(studentId, 'studentId')
    assertNotAborted(options)
    return clone(this.curricula.get(studentId) ?? null)
  }

  async createCurriculum(studentId: number, request: SaveCurriculumRequest) {
    assertPositiveId(studentId, 'studentId')
    this.assertSaveRequest(request)
    if (this.curricula.get(studentId)) {
      throw new ApiError({
        status: 409,
        code: 'NEXT_CURRICULUM_ALREADY_EXISTS',
        message: '이미 수정 가능한 다음 회차 커리큘럼이 있습니다.',
      })
    }

    const curriculum: DailyCurriculum = {
      curriculumId: this.nextCurriculumId++,
      status: 'NOT_STARTED',
      trainings: this.materializeTrainings([], request.trainingTemplateIds),
    }
    this.curricula.set(studentId, curriculum)
    return clone(curriculum)
  }

  async getCurriculum(studentId: number, curriculumId: number, options?: TrainingRequestOptions) {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(curriculumId, 'curriculumId')
    assertNotAborted(options)
    const curriculum = this.curricula.get(studentId)
    if (!curriculum || curriculum.curriculumId !== curriculumId) {
      throw new ApiError({
        status: 404,
        code: 'CURRICULUM_NOT_FOUND',
        message: '커리큘럼을 찾을 수 없습니다.',
      })
    }
    return clone(curriculum)
  }

  async updateCurriculum(studentId: number, curriculumId: number, request: SaveCurriculumRequest) {
    this.assertSaveRequest(request)
    const current = await this.getCurriculum(studentId, curriculumId)
    if (current.status !== 'NOT_STARTED') {
      throw new ApiError({
        status: 409,
        code: 'CURRICULUM_ALREADY_STARTED',
        message: '시작된 커리큘럼은 수정할 수 없습니다.',
      })
    }

    const trainings = this.materializeTrainings(current.trainings, request.trainingTemplateIds)
    const retainedIds = new Set(trainings.map((training) => training.trainingId))
    for (const training of current.trainings) {
      if (!retainedIds.has(training.trainingId)) {
        this.details.delete(training.trainingId)
        this.expectedWords.delete(training.trainingId)
        this.lessonMaterials.delete(training.trainingId)
      }
    }
    const updated: DailyCurriculum = { ...current, trainings }
    this.curricula.set(studentId, updated)
    return clone(updated)
  }

  async getExpectedWords(studentId: number, trainingId: number, options?: TrainingRequestOptions) {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    assertNotAborted(options)
    return clone(this.expectedWords.get(trainingId) ?? [])
  }

  async addExpectedWord(studentId: number, trainingId: number, wordName: string) {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    const normalized = wordName.trim()
    if (!normalized || normalized.length > 50) {
      throw new ApiError({
        status: 400,
        code: 'INVALID_EXPECTED_WORD',
        message: '예상 단어는 1자 이상 50자 이하여야 합니다.',
      })
    }
    const words = this.expectedWords.get(trainingId) ?? []
    if (words.some((word) => word.wordName === normalized)) {
      throw new ApiError({
        status: 400,
        code: 'DUPLICATE_EXPECTED_WORD',
        message: '이미 추가된 예상 단어입니다.',
      })
    }
    this.expectedWords.set(trainingId, [
      ...words,
      { wordId: this.nextWordId++, wordName: normalized },
    ])
    this.invalidateGeneratedTraining(trainingId)
  }

  async deleteExpectedWord(studentId: number, trainingId: number, wordId: number) {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    const words = this.expectedWords.get(trainingId) ?? []
    if (!words.some((word) => word.wordId === wordId)) {
      throw new ApiError({
        status: 404,
        code: 'EXPECTED_WORD_NOT_FOUND',
        message: '예상 단어를 찾을 수 없습니다.',
      })
    }
    this.expectedWords.set(
      trainingId,
      words.filter((word) => word.wordId !== wordId),
    )
    this.invalidateGeneratedTraining(trainingId)
  }

  async generateTraining(
    studentId: number,
    trainingId: number,
  ): Promise<GeneratedTrainingData> {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    const detail = this.details.get(trainingId)
    if (!detail) {
      throw new ApiError({
        status: 404,
        code: 'TRAINING_DETAIL_NOT_FOUND',
        message: '훈련 상세 정보를 찾을 수 없습니다.',
      })
    }
    if (detail.status !== 'NOT_READY') {
      throw new ApiError({
        status: 409,
        code: 'TRAINING_ALREADY_READY',
        message: '시작했거나 완료한 훈련은 다시 생성할 수 없습니다.',
      })
    }

    const words = this.expectedWords.get(trainingId) ?? []
    const targets =
      words.length > 0
        ? words.map((word) => word.wordName)
        : [`${detail.name} 연습 ${detail.trainingTemplateId}`]
    const generatedData: GeneratedTrainingData = {
      schemaVersion: 2,
      trainingTemplateId: detail.trainingTemplateId,
      expectedWords: clone(words),
      questions: targets.map((target, index) => ({
        questionId: index + 1,
        problem: {
          targetText: target,
          instruction: `${detail.name} 활동을 수행해 보세요.`,
        },
        answer: {
          correctText: target,
        },
      })),
    }
    this.details.set(trainingId, {
      ...detail,
      generatedData,
      status: 'NOT_STARTED',
    })
    this.lessonMaterials.delete(trainingId)
    return clone(generatedData)
  }

  async getTrainingDetail(studentId: number, trainingId: number, options?: TrainingRequestOptions) {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    assertNotAborted(options)
    const detail = this.details.get(trainingId)
    if (!detail) {
      throw new ApiError({
        status: 404,
        code: 'TRAINING_DETAIL_NOT_FOUND',
        message: '훈련 상세 정보를 찾을 수 없습니다.',
      })
    }
    return clone(detail)
  }

  async getLessonMaterial(
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ): Promise<LessonMaterialDocument> {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    assertNotAborted(options)
    const existing = this.lessonMaterials.get(trainingId)
    if (existing) return clone(assertLessonMaterialResponseCount(existing))

    const training = this.currentTraining(studentId, trainingId)
    const detail = this.details.get(trainingId)
    if (!training || !detail) {
      throw new ApiError({
        status: 404,
        code: 'TRAINING_NOT_FOUND',
        message: '해당 학습자의 훈련을 찾을 수 없습니다.',
      })
    }
    const created = createMockLessonMaterialDocument(training, detail)
    this.lessonMaterials.set(trainingId, created)
    return clone(created)
  }

  async saveLessonMaterial(
    studentId: number,
    trainingId: number,
    request: SaveLessonMaterialRequest,
  ): Promise<SavedLessonMaterial> {
    const current = await this.getLessonMaterial(studentId, trainingId)
    assertSaveLessonMaterialRequest(request, current)
    const materials = normalizeSavedMaterials(request, current)
    const revision = current.revision + 1
    const savedAt = new Date().toISOString()
    const updated: LessonMaterialDocument = {
      ...current,
      revision,
      materials,
    }
    this.lessonMaterials.set(trainingId, updated)

    const detail = this.details.get(trainingId)
    if (detail) {
      this.details.set(trainingId, {
        ...detail,
        generatedData: {
          schemaVersion: updated.schemaVersion,
          questions: materials.map((material) => ({
            questionNo: material.questionNo,
            type: material.questionType,
            presentation: clone(material.presentation),
            content: clone(material.content),
            answer: clone(material.answer),
          })),
        },
      })
    }

    return clone({
      trainingId,
      revision,
      savedAt,
      source: 'MANUAL',
      materials,
    })
  }

  async getCurriculumLogs(
    studentId: number,
    period: TrainingPeriod,
    options?: TrainingRequestOptions,
  ) {
    assertPositiveId(studentId, 'studentId')
    assertNotAborted(options)
    const logs = this.curriculumLogs.get(studentId)?.[period] ?? []
    return clone(
      [...logs].sort(
        (left, right) =>
          right.date.localeCompare(left.date) || right.curriculumId - left.curriculumId,
      ),
    )
  }

  async getTrainingLog(studentId: number, curriculumId: number, options?: TrainingRequestOptions) {
    this.assertCurriculumBelongsToStudent(studentId, curriculumId)
    assertNotAborted(options)
    const log = this.trainingLogs.get(curriculumId)
    if (!log) {
      throw new ApiError({
        status: 404,
        code: 'TRAINING_LOG_NOT_FOUND',
        message: '훈련 이력을 찾을 수 없습니다.',
      })
    }
    return clone(log)
  }

  async getStatistics(
    studentId: number,
    curriculumId: number,
    period: TrainingPeriod,
    options?: TrainingRequestOptions,
  ) {
    this.assertCurriculumBelongsToStudent(studentId, curriculumId)
    assertNotAborted(options)
    const statistics = this.statistics.get(`${curriculumId}:${period}`)
    const emptyStatistics: TrainingStatistics = {
      accuracyComparisons: [],
      readingSpeedTrend: {
        unit: 'CORRECT_WORDS_PER_MINUTE',
        changeRate: null,
        points: [],
      },
    }
    return clone(statistics ?? emptyStatistics)
  }

  async getGazeAnalysis(
    studentId: number,
    trainingId: number,
    options?: TrainingRequestOptions,
  ): Promise<GazeAnalysisState> {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    assertNotAborted(options)
    return clone(
      this.gazeByTrainingId.get(trainingId) ?? {
        status: 'NO_DATA',
        analysis: null,
      },
    )
  }

  async exportTraining(studentId: number, trainingId: number, format: TrainingExportFormat) {
    this.assertTrainingBelongsToStudent(studentId, trainingId)
    const detail = this.details.get(trainingId)
    if (!detail) {
      throw new ApiError({
        status: 404,
        code: 'TRAINING_DETAIL_NOT_FOUND',
        message: '훈련 상세 정보를 찾을 수 없습니다.',
      })
    }
    if (format === 'CSV') {
      const csv = [
        'trainingId,trainingName,status,accuracy',
        `${detail.trainingId},"${detail.name.replaceAll('"', '""')}",${detail.status},${detail.accuracy ?? ''}`,
      ].join('\n')
      return {
        blob: new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }),
        fileName: `training-${trainingId}-mock.csv`,
        contentType: 'text/csv;charset=utf-8',
      }
    }
    return {
      blob: new Blob([JSON.stringify(detail, null, 2)], {
        type: 'application/json;charset=utf-8',
      }),
      fileName: `training-${trainingId}-mock.json`,
      contentType: 'application/json;charset=utf-8',
    }
  }

  private assertSaveRequest(request: SaveCurriculumRequest): void {
    assertSaveCurriculumRequest(
      request,
      new Set(this.catalog.map((item) => item.trainingTemplateId)),
    )
  }

  private assertTrainingBelongsToStudent(studentId: number, trainingId: number): void {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(trainingId, 'trainingId')
    const currentCurriculum = this.curricula.get(studentId)
    const belongsToCurrent = currentCurriculum?.trainings.some(
      (training) => training.trainingId === trainingId,
    )
    const belongsToHistory = (this.curriculumLogs.get(studentId)?.['3m'] ?? []).some((curriculum) =>
      curriculum.trainings.some((training) => training.trainingId === trainingId),
    )
    if (!belongsToCurrent && !belongsToHistory) {
      throw new ApiError({
        status: 404,
        code: 'TRAINING_NOT_FOUND',
        message: '해당 학습자의 훈련을 찾을 수 없습니다.',
      })
    }
  }

  private assertCurriculumBelongsToStudent(studentId: number, curriculumId: number): void {
    assertPositiveId(studentId, 'studentId')
    assertPositiveId(curriculumId, 'curriculumId')
    const belongs = (this.curriculumLogs.get(studentId)?.['3m'] ?? []).some(
      (curriculum) => curriculum.curriculumId === curriculumId,
    )
    if (!belongs) {
      throw new ApiError({
        status: 404,
        code: 'CURRICULUM_NOT_FOUND',
        message: '완료된 커리큘럼을 찾을 수 없습니다.',
      })
    }
  }

  private currentTraining(studentId: number, trainingId: number): CurriculumTraining | null {
    return (
      this.curricula
        .get(studentId)
        ?.trainings.find((training) => training.trainingId === trainingId) ?? null
    )
  }

  private materializeTrainings(
    previous: readonly CurriculumTraining[],
    templateIds: readonly number[],
  ): readonly CurriculumTraining[] {
    const reusableByTemplate = new Map<number, CurriculumTraining[]>()
    for (const training of previous) {
      const reusable = reusableByTemplate.get(training.trainingTemplateId) ?? []
      reusable.push(training)
      reusableByTemplate.set(training.trainingTemplateId, reusable)
    }

    return templateIds.map((templateId, index) => {
      const template = this.catalog.find((item) => item.trainingTemplateId === templateId)
      if (!template) throw new TypeError(`Unknown training template: ${templateId}`)
      const retained = reusableByTemplate.get(templateId)?.shift()
      if (retained) {
        const updated = { ...retained, sequence: index + 1 }
        this.ensureTrainingDetail(updated, template)
        return updated
      }
      const created: CurriculumTraining = {
        trainingId: this.nextTrainingId++,
        trainingTemplateId: templateId,
        sequence: index + 1,
        unitName: template.unitName,
        trainingName: template.trainingName,
        status: 'NOT_READY',
      }
      this.ensureTrainingDetail(created, template)
      this.expectedWords.set(created.trainingId, [])
      return created
    })
  }

  private ensureTrainingDetail(training: CurriculumTraining, template: TrainingCatalogItem): void {
    const current = this.details.get(training.trainingId)
    this.details.set(training.trainingId, {
      trainingId: training.trainingId,
      trainingTemplateId: training.trainingTemplateId,
      name: training.trainingName,
      form: template.form,
      generatedData: current?.generatedData ?? null,
      status: current?.status ?? training.status,
      startedAt: current?.startedAt ?? null,
      finishedAt: current?.finishedAt ?? null,
      result: current?.result ?? null,
      accuracy: current?.accuracy ?? null,
    })
  }

  private invalidateGeneratedTraining(trainingId: number): void {
    const detail = this.details.get(trainingId)
    if (!detail) return
    this.details.set(trainingId, {
      ...detail,
      generatedData: null,
      status: 'NOT_READY',
    })
    this.lessonMaterials.delete(trainingId)
  }
}

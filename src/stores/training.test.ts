import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CurriculumSynchronizationError,
  currentCurriculumFixture,
  MockTrainingRepository,
  type DailyCurriculum,
  type TrainingRepository,
} from '@/features/teacher/training'
import type { GazeAnalysisState } from '@/features/teacher/gaze'
import { ApiError } from '@/lib/api'
import { useTrainingStore } from './training'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

function repository(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    getCatalog: vi.fn().mockResolvedValue([]),
    getCurrentCurriculum: vi.fn().mockResolvedValue(null),
    createCurriculum: vi.fn(),
    getCurriculum: vi.fn(),
    updateCurriculum: vi.fn(),
    completeCurriculumReview: vi.fn(),
    generateTraining: vi.fn().mockResolvedValue({ questions: [] }),
    getTrainingDetail: vi.fn().mockResolvedValue({
      trainingId: 101,
      trainingTemplateId: 12,
      name: '테스트 훈련',
      form: null,
      generatedData: { questions: [] },
      status: 'NOT_STARTED',
      startedAt: null,
      finishedAt: null,
      result: null,
      accuracy: null,
    }),
    getLessonMaterial: vi.fn().mockResolvedValue(undefined as never),
    saveLessonMaterial: vi.fn().mockResolvedValue(undefined as never),
    getCurriculumLogs: vi.fn().mockResolvedValue([]),
    getTrainingLog: vi.fn(),
    getStatistics: vi.fn(),
    getGazeAnalysis: vi.fn().mockResolvedValue({ status: 'NO_DATA', analysis: null }),
    exportTraining: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Training store', () => {
  it('keeps rendered history data during a same-student background refresh', async () => {
    const mock = new MockTrainingRepository()
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadHistoryForStudent(1)

    const previousLogs = store.curriculumLogs
    const previousCurriculumId = store.selectedCurriculumId
    const previousTrainingLog = store.trainingLog
    const previousTrainingId = store.selectedHistoryTrainingId
    const previousDetail = store.historyTrainingDetail
    const pendingLogs = deferred<Array<(typeof previousLogs)[number]>>()
    vi.spyOn(mock, 'getCurriculumLogs').mockReturnValueOnce(pendingLogs.promise)
    const refresh = store.loadHistoryForStudent(1)

    expect(store.curriculumLogsStatus).toBe('success')
    expect(store.curriculumLogs).toBe(previousLogs)
    expect(store.selectedCurriculumId).toBe(previousCurriculumId)
    expect(store.trainingLog).toBe(previousTrainingLog)
    expect(store.selectedHistoryTrainingId).toBe(previousTrainingId)
    expect(store.historyTrainingDetail).toBe(previousDetail)

    pendingLogs.resolve([...previousLogs])
    await refresh
    expect(store.selectedCurriculumId).toBe(previousCurriculumId)
    expect(store.selectedHistoryTrainingId).toBe(previousTrainingId)
  })

  it('keeps curriculum rows rendered during a same-student realtime refresh', async () => {
    const mock = new MockTrainingRepository()
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)

    const previousCatalog = store.catalog
    const previousCurriculum = store.savedCurriculum
    const previousDraft = store.draftItems
    const pendingCatalog = deferred<typeof previousCatalog>()
    const pendingCurriculum = deferred<DailyCurriculum | null>()
    vi.spyOn(mock, 'getCatalog').mockReturnValueOnce(pendingCatalog.promise)
    vi.spyOn(mock, 'getCurrentCurriculum').mockReturnValueOnce(pendingCurriculum.promise)

    const refresh = store.refreshForStudent(1)

    expect(store.catalogStatus).toBe('success')
    expect(store.curriculumStatus).toBe('success')
    expect(store.catalog).toBe(previousCatalog)
    expect(store.savedCurriculum).toBe(previousCurriculum)
    expect(store.draftItems).toBe(previousDraft)

    store.selectTemplate(14)
    store.addSelectedTemplate()
    const editedDraftLength = store.draftItems.length

    pendingCatalog.resolve([...previousCatalog])
    pendingCurriculum.resolve(previousCurriculum)
    await expect(refresh).resolves.toBe(true)
    expect(store.catalog).toHaveLength(previousCatalog.length)
    expect(store.draftItems).toHaveLength(editedDraftLength)
    expect(store.hasChanges).toBe(true)
  })
  it('훈련 목록을 sequence로 재정렬하지 않고 백엔드 배열 순서를 유지한다', async () => {
    const store = useTrainingStore()
    store.setRepository(
      repository({
        getCatalog: vi.fn().mockResolvedValue([
          {
            trainingTemplateId: 14,
            unitName: '글자 만들기',
            sequence: 1,
            trainingName: '음소 합쳐 음절 만들기',
            studentAchievementRate: null,
            form: null,
          },
          {
            trainingTemplateId: 4,
            unitName: '소리 듣고 고르기',
            sequence: 1,
            trainingName: '자음 소리 고르기',
            studentAchievementRate: null,
            form: null,
          },
        ]),
      }),
    )

    await store.loadForStudent(1)

    expect(store.catalog.map((item) => item.trainingTemplateId)).toEqual([14, 4])
  })

  it('훈련 이력 재조회 실패 시 이전 커리큘럼을 유지한다', async () => {
    const mock = new MockTrainingRepository()
    const getCurriculumLogs = vi.spyOn(mock, 'getCurriculumLogs')
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadHistoryForStudent(1)
    const previousLogs = store.curriculumLogs

    getCurriculumLogs.mockRejectedValueOnce(
      new ApiError({
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'internal details',
      }),
    )
    await store.retryHistory()

    expect(store.curriculumLogsStatus).toBe('error')
    expect(store.curriculumLogs).toBe(previousLogs)
    expect(store.curriculumLogsError).not.toContain('internal')
    expect(store.curriculumLogsUiError?.kind).toBe('server')
  })

  it('훈련 이력 재조회가 빈 결과이면 이전 하위 선택을 정리한다', async () => {
    const mock = new MockTrainingRepository()
    const getCurriculumLogs = vi.spyOn(mock, 'getCurriculumLogs')
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadHistoryForStudent(1)

    getCurriculumLogs.mockResolvedValueOnce([])
    await store.retryHistory()

    expect(store.curriculumLogsStatus).toBe('success')
    expect(store.curriculumLogs).toEqual([])
    expect(store.selectedCurriculumId).toBeNull()
    expect(store.trainingLog).toBeNull()
    expect(store.statistics).toBeNull()
    expect(store.historyTrainingDetail).toBeNull()
    expect(store.historyGazeAnalysis).toBeNull()
  })

  it('저장된 커리큘럼과 local draft를 분리하고 실제 ID를 유지한다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())

    await store.loadForStudent(1)
    store.selectTemplate(14)
    store.addSelectedTemplate()
    store.selectTemplate(11)
    store.addSelectedTemplate()

    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([101, 102, 103])
    expect(store.draftTrainingIds).toEqual([12, 12, 13, 14, 11])
    expect(store.hasChanges).toBe(true)

    await expect(store.saveCurriculum()).resolves.toBe(true)
    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([
      101, 102, 103, 1_000, 1_001,
    ])
    expect(store.hasChanges).toBe(false)
  })

  it('차회 커리큘럼이 없으면 빈 draft에서 최초 POST로 생성한다', async () => {
    const mock = new MockTrainingRepository({ curricula: { 2: null } })
    const store = useTrainingStore()
    store.setRepository(mock)

    await store.loadForStudent(2)
    expect(store.savedCurriculum).toBeNull()
    expect(store.draftItems).toEqual([])
    await expect(store.saveCurriculum()).resolves.toBe(false)

    store.selectTemplate(11)
    Array.from({ length: 5 }).forEach(() => store.addSelectedTemplate())

    await expect(store.saveCurriculum()).resolves.toBe(true)
    expect(store.savedCurriculum).toMatchObject({
      status: 'NOT_STARTED',
      trainings: Array.from({ length: 5 }, () =>
        expect.objectContaining({ trainingTemplateId: 11 }),
      ),
    })
  })

  it('PATCH 후 재조회 실패 시 ID 기반 기능을 잠그고 GET만 다시 시도한다', async () => {
    const current: DailyCurriculum = {
      curriculumId: 20,
      status: 'NOT_STARTED',
      trainings: [
        {
          trainingId: 101,
          trainingTemplateId: 11,
          sequence: 1,
          unitName: '음운',
          trainingName: '첫소리',
          status: 'NOT_STARTED',
        },
        {
          trainingId: 102,
          trainingTemplateId: 12,
          sequence: 2,
          unitName: '파닉스',
          trainingName: '받침',
          status: 'NOT_STARTED',
        },
        {
          trainingId: 103,
          trainingTemplateId: 13,
          sequence: 3,
          unitName: '유창성',
          trainingName: '문장',
          status: 'NOT_STARTED',
        },
      ],
    }
    const refreshed: DailyCurriculum = {
      ...current,
      trainings: [
        ...current.trainings,
        {
          trainingId: 204,
          trainingTemplateId: 14,
          sequence: 4,
          unitName: '이해력',
          trainingName: '핵심',
          status: 'NOT_STARTED',
        },
        {
          trainingId: 205,
          trainingTemplateId: 15,
          sequence: 5,
          unitName: '어휘',
          trainingName: '낱말',
          status: 'NOT_STARTED',
        },
      ],
    }
    const getCurrentCurriculum = vi
      .fn()
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(refreshed)
    const updateCurriculum = vi
      .fn()
      .mockRejectedValueOnce(new CurriculumSynchronizationError(new Error('network')))
    const store = useTrainingStore()
    store.setRepository(
      repository({
        getCatalog: vi.fn().mockResolvedValue([
          { trainingTemplateId: 11, unitName: '음운', sequence: 1, trainingName: '첫소리' },
          { trainingTemplateId: 12, unitName: '파닉스', sequence: 2, trainingName: '받침' },
          { trainingTemplateId: 13, unitName: '유창성', sequence: 3, trainingName: '문장' },
          { trainingTemplateId: 14, unitName: '이해력', sequence: 4, trainingName: '핵심' },
          { trainingTemplateId: 15, unitName: '어휘', sequence: 5, trainingName: '낱말' },
        ]),
        getCurrentCurriculum,
        updateCurriculum,
        getTrainingDetail: vi.fn().mockResolvedValue({
          trainingId: 101,
          trainingTemplateId: 11,
          name: '첫소리',
          form: null,
          generatedData: null,
          status: 'NOT_STARTED',
          startedAt: null,
          finishedAt: null,
          result: null,
          accuracy: null,
        }),
      }),
    )

    await store.loadForStudent(1)
    store.selectTemplate(14)
    store.addSelectedTemplate()
    store.selectTemplate(15)
    store.addSelectedTemplate()

    await expect(store.saveCurriculum()).resolves.toBe(false)
    expect(store.curriculumSynchronizationStatus).toBe('required')
    expect(store.canEditCurriculum).toBe(false)
    expect(store.selectedTrainingId).toBeNull()
    await expect(store.saveCurriculum()).resolves.toBe(false)
    expect(updateCurriculum).toHaveBeenCalledTimes(1)

    await expect(store.retryCurriculumSynchronization()).resolves.toBe(true)
    expect(updateCurriculum).toHaveBeenCalledTimes(1)
    expect(getCurrentCurriculum).toHaveBeenCalledTimes(2)
    expect(store.curriculumSynchronizationStatus).toBe('synced')
    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([
      101, 102, 103, 204, 205,
    ])
    expect(store.hasChanges).toBe(false)
  })

  it('409 저장 충돌 시 draft를 유지하고 명시적 최신 상태 복구 후에만 편집을 푼다', async () => {
    const mock = new MockTrainingRepository()
    const getCurrentCurriculum = vi.spyOn(mock, 'getCurrentCurriculum')
    const updateCurriculum = vi.spyOn(mock, 'updateCurriculum').mockRejectedValueOnce(
      new ApiError({
        status: 409,
        code: 'CURRICULUM_ALREADY_STARTED',
        message: 'conflict',
      }),
    )
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    store.selectTemplate(14)
    store.addSelectedTemplate()
    store.selectTemplate(11)
    store.addSelectedTemplate()

    await expect(store.saveCurriculum()).resolves.toBe(false)

    expect(updateCurriculum).toHaveBeenCalledTimes(1)
    expect(store.curriculumSaveConflict).toBe(true)
    expect(store.canEditCurriculum).toBe(false)
    expect(store.hasChanges).toBe(true)
    expect(store.curriculumError).toContain('서버의 최신 내용을 다시 불러와 주세요')

    await expect(store.refreshCurriculumAfterConflict()).resolves.toBe(true)

    expect(getCurrentCurriculum).toHaveBeenCalledTimes(2)
    expect(store.curriculumSaveConflict).toBe(false)
    expect(store.canEditCurriculum).toBe(true)
    expect(store.hasChanges).toBe(false)
  })

  it('학생 이동 후 도착한 이전 커리큘럼 재동기화 응답을 무시한다', async () => {
    const oldSynchronization = deferred<DailyCurriculum | null>()
    const first: DailyCurriculum = {
      curriculumId: 10,
      status: 'NOT_STARTED',
      trainings: [],
    }
    const second: DailyCurriculum = {
      curriculumId: 20,
      status: 'NOT_STARTED',
      trainings: [],
    }
    const getCurrentCurriculum = vi
      .fn()
      .mockResolvedValueOnce(first)
      .mockReturnValueOnce(oldSynchronization.promise)
      .mockResolvedValueOnce(second)
    const store = useTrainingStore()
    store.setRepository(repository({ getCurrentCurriculum }))

    await store.loadForStudent(1)
    store.curriculumSynchronizationStatus = 'required'
    const oldRequest = store.retryCurriculumSynchronization()
    await store.loadForStudent(2)
    oldSynchronization.resolve({
      curriculumId: 11,
      status: 'NOT_STARTED',
      trainings: [],
    })
    await oldRequest

    expect(store.currentStudentId).toBe(2)
    expect(store.savedCurriculum?.curriculumId).toBe(20)
    expect(store.curriculumSynchronizationStatus).toBe('synced')
  })

  it('느린 이전 학습자 응답이 새 학습자의 draft를 덮지 않는다', async () => {
    const oldCurriculum = deferred<DailyCurriculum | null>()
    const newCurriculum: DailyCurriculum = {
      curriculumId: 2,
      status: 'NOT_STARTED',
      trainings: [],
    }
    const getCurrentCurriculum = vi
      .fn()
      .mockReturnValueOnce(oldCurriculum.promise)
      .mockResolvedValueOnce(newCurriculum)
    const store = useTrainingStore()
    store.setRepository(
      repository({
        getCatalog: vi.fn().mockResolvedValue([]),
        getCurrentCurriculum,
      }),
    )

    const oldRequest = store.loadForStudent(1)
    await store.loadForStudent(2)
    oldCurriculum.resolve({
      curriculumId: 1,
      status: 'NOT_STARTED',
      trainings: [],
    })
    await oldRequest

    expect(store.currentStudentId).toBe(2)
    expect(store.savedCurriculum?.curriculumId).toBe(2)
  })

  it('준비 전 훈련의 AI 교안을 재생성하고 실제 응답으로 미리보기를 갱신한다', async () => {
    const mock = new MockTrainingRepository()
    const generateTraining = vi.spyOn(mock, 'generateTraining')
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    await store.selectDraftItem(1, 'training-102')

    expect(store.requiresMaterialRegeneration).toBe(true)
    expect(store.selectedTrainingDetail?.status).toBe('NOT_READY')

    await expect(store.regenerateSelectedTraining()).resolves.toBe(true)

    expect(generateTraining).toHaveBeenCalledWith(1, 102)
    expect(store.materialGenerationStatus).toBe('success')
    expect(store.materialGenerationError).toBeNull()
    expect(store.requiresMaterialRegeneration).toBe(false)
    expect(store.selectedTrainingDetail?.status).toBe('NOT_STARTED')
    expect(store.selectedTrainingDetail?.generatedData?.questions).toHaveLength(5)
  })

  it('교안 저장 성공 응답으로 같은 화면 문서의 revision과 자료를 교체한다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())
    await store.loadForStudent(1)
    const document = store.selectedLessonMaterial
    expect(document).not.toBeNull()
    if (!document) return

    const saved = await store.saveSelectedLessonMaterial({
      revision: document.revision,
      materials: document.materials.map((material, index) => ({
        questionNo: index + 1,
        questionType: material.questionType,
        presentation: {
          ...material.presentation,
          activityName: index === 0 ? '교수자 수정 활동' : material.presentation.activityName,
        },
        content: material.content,
        answer: material.answer,
      })),
    })

    expect(saved).toBe(true)
    expect(store.lessonMaterialSaveStatus).toBe('success')
    expect(store.selectedLessonMaterial?.revision).toBe(document.revision + 1)
    expect(store.selectedLessonMaterial?.materials[0]?.presentation.activityName).toBe(
      '교수자 수정 활동',
    )
  })

  it('교안 revision 충돌은 서버 기준과 편집 상태를 유지하고 최신 조회를 요구한다', async () => {
    const mock = new MockTrainingRepository()
    vi.spyOn(mock, 'saveLessonMaterial').mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'LESSON_MATERIAL_REVISION_CONFLICT',
        message: '교안이 변경되었습니다.',
      }),
    )
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    const document = store.selectedLessonMaterial
    expect(document).not.toBeNull()
    if (!document) return
    store.setLessonMaterialEditingState(document.trainingId, true)

    await expect(
      store.saveSelectedLessonMaterial({
        revision: document.revision,
        materials: document.materials,
      }),
    ).resolves.toBe(false)

    expect(store.selectedLessonMaterial?.revision).toBe(document.revision)
    expect(store.lessonMaterialSaveIssue).toBe('revision-conflict')
    expect(store.lessonMaterialRemoteChange).toBe(true)
    expect(store.lessonMaterialHasLocalChanges).toBe(true)
  })

  it('편집 불가 응답은 서버 자료를 유지한 채 교안을 읽기 전용으로 전환한다', async () => {
    const mock = new MockTrainingRepository()
    vi.spyOn(mock, 'saveLessonMaterial').mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'TRAINING_NOT_EDITABLE',
        message: '수정할 수 없습니다.',
      }),
    )
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    const document = store.selectedLessonMaterial
    expect(document).not.toBeNull()
    if (!document) return

    await store.saveSelectedLessonMaterial({
      revision: document.revision,
      materials: document.materials,
    })

    expect(store.lessonMaterialSaveIssue).toBe('not-editable')
    expect(store.selectedLessonMaterial?.editable).toBe(false)
    expect(store.selectedLessonMaterial?.materials).toEqual(document.materials)
  })

  it('교안 검증 오류의 path와 message를 필드 오류로 보존하고 수정 시 제거한다', async () => {
    const mock = new MockTrainingRepository()
    vi.spyOn(mock, 'saveLessonMaterial').mockRejectedValue(
      new ApiError({
        status: 422,
        code: 'LESSON_MATERIAL_VALIDATION_FAILED',
        message: '검증에 실패했습니다.',
        responseBody: {
          error: {
            code: 'LESSON_MATERIAL_VALIDATION_FAILED',
            message: '검증에 실패했습니다.',
            details: {
              errors: [
                {
                  path: 'materials[0].presentation.activityName',
                  reason: 'NOT_BLANK',
                  message: '활동 이름을 입력해 주세요.',
                },
              ],
            },
          },
        },
      }),
    )
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    const document = store.selectedLessonMaterial
    expect(document).not.toBeNull()
    if (!document) return

    await store.saveSelectedLessonMaterial({
      revision: document.revision,
      materials: document.materials,
    })

    expect(store.lessonMaterialSaveIssue).toBe('validation')
    expect(store.lessonMaterialFieldErrors).toEqual([
      {
        path: 'materials[0].presentation.activityName',
        reason: 'NOT_BLANK',
        message: '활동 이름을 입력해 주세요.',
      },
    ])

    store.clearLessonMaterialFieldError('materials[0].presentation.activityName')
    expect(store.lessonMaterialFieldErrors).toEqual([])
  })

  it('네트워크 저장 실패는 마지막 서버 revision과 자료 및 편집 상태를 유지한다', async () => {
    const mock = new MockTrainingRepository()
    vi.spyOn(mock, 'saveLessonMaterial').mockRejectedValue(new Error('network'))
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    const document = store.selectedLessonMaterial
    expect(document).not.toBeNull()
    if (!document) return
    store.setLessonMaterialEditingState(document.trainingId, true)

    await expect(
      store.saveSelectedLessonMaterial({
        revision: document.revision,
        materials: document.materials,
      }),
    ).resolves.toBe(false)

    expect(store.lessonMaterialSaveIssue).toBe('network')
    expect(store.selectedLessonMaterial?.revision).toBe(document.revision)
    expect(store.selectedLessonMaterial?.materials).toEqual(document.materials)
    expect(store.lessonMaterialHasLocalChanges).toBe(true)
  })

  it('CONTENT_UPDATED는 수정 초안을 덮어쓰지 않고 revision 차이가 있을 때만 알린다', async () => {
    const mock = new MockTrainingRepository()
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    const local = store.selectedLessonMaterial
    expect(local).not.toBeNull()
    if (!local) return
    store.setLessonMaterialEditingState(local.trainingId, true)

    await expect(store.handleLessonMaterialContentUpdated(1, local.trainingId)).resolves.toBe(true)
    expect(store.lessonMaterialRemoteChange).toBe(false)

    const remote = await mock.saveLessonMaterial(1, local.trainingId, {
      revision: local.revision,
      materials: local.materials.map((material, index) => ({
        questionNo: index + 1,
        questionType: material.questionType,
        presentation: {
          ...material.presentation,
          activityName: index === 0 ? '원격 수정 활동' : material.presentation.activityName,
        },
        content: material.content,
        answer: material.answer,
      })),
    })

    await expect(store.handleLessonMaterialContentUpdated(1, local.trainingId)).resolves.toBe(true)
    expect(store.selectedLessonMaterial?.revision).toBe(local.revision)
    expect(store.lessonMaterialRemoteChange).toBe(true)
    expect(store.lessonMaterialRemoteRevision).toBe(remote.revision)

    store.setLessonMaterialEditingState(local.trainingId, false)
    await store.handleLessonMaterialContentUpdated(1, local.trainingId)
    expect(store.selectedLessonMaterial?.revision).toBe(remote.revision)
    expect(store.selectedLessonMaterial?.materials[0]?.presentation.activityName).toBe(
      '원격 수정 활동',
    )
    expect(store.lessonMaterialRemoteChange).toBe(false)
  })

  it('reset이 커리큘럼·교안·선택 상태를 모두 비운다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())
    await store.loadForStudent(1)
    await store.selectDraftItem(1, 'training-101')

    store.reset()

    expect(store.currentStudentId).toBeNull()
    expect(store.catalog).toEqual([])
    expect(store.savedCurriculum).toBeNull()
    expect(store.selectedTrainingId).toBeNull()
    expect(store.lessonMaterialByTrainingId).toEqual({})
  })

  it('기본 30일 이력에서 최신 커리큘럼과 첫 실제 훈련을 선택한다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())

    await store.loadHistoryForStudent(1)

    expect(store.period).toBe('30d')
    expect(store.curriculumLogs.map((item) => item.curriculumId)).toEqual([190, 189])
    expect(store.selectedCurriculumId).toBe(190)
    expect(store.trainingLog?.curriculumId).toBe(190)
    expect(store.selectedHistoryTrainingId).toBe(901)
    expect(store.historyTrainingDetail).toMatchObject({
      trainingId: 901,
      status: 'COMPLETED',
    })
    expect(store.statistics?.readingSpeedTrend.unit).toBe('CORRECT_WORDS_PER_MINUTE')
    expect(store.historyGazeStatus).toBe('success')
    expect(store.historyGazeAnalysis).toMatchObject({ status: 'AVAILABLE' })
  })

  it('빠른 훈련 선택 변경에서 늦게 끝난 이전 시선 응답을 무시한다', async () => {
    const oldGaze = deferred<GazeAnalysisState>()
    const mock = new MockTrainingRepository()
    vi.spyOn(mock, 'getGazeAnalysis')
      .mockResolvedValueOnce({
        status: 'AVAILABLE',
        analysis: {
          gazeSessionId: 1,
          gazeAnalysisResultId: 2,
          totalVisitedDurationMs: 100,
          totalVisitedCount: 1,
          reverseReadCount: 0,
          avgVisitedDurationMs: 100,
        },
      })
      .mockReturnValueOnce(oldGaze.promise)
      .mockResolvedValueOnce({ status: 'FAILED', analysis: null })
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadHistoryForStudent(1)

    const oldRequest = store.selectHistoryTraining(1, 902)
    await store.selectHistoryTraining(1, 903)
    oldGaze.resolve({ status: 'NO_DATA', analysis: null })
    await oldRequest

    expect(store.selectedHistoryTrainingId).toBe(903)
    expect(store.historyGazeAnalysis).toEqual({
      status: 'FAILED',
      analysis: null,
    })
  })

  it('시선 요청 오류를 상세 성공과 도메인 상태에서 분리한다', async () => {
    const mock = new MockTrainingRepository()
    vi.spyOn(mock, 'getGazeAnalysis').mockRejectedValue(new Error('internal details'))
    const store = useTrainingStore()
    store.setRepository(mock)

    await store.loadHistoryForStudent(1)

    expect(store.historyDetailStatus).toBe('success')
    expect(store.historyGazeStatus).toBe('error')
    expect(store.historyGazeError).toBe('시선 분석 결과를 불러오지 못했습니다.')
    expect(store.historyGazeAnalysis).toBeNull()
  })

  it('기간을 바꿀 때 늦게 끝난 이전 응답을 무시한다', async () => {
    const oldLogs = deferred<Awaited<ReturnType<TrainingRepository['getCurriculumLogs']>>>()
    const getCurriculumLogs = vi.fn().mockReturnValueOnce(oldLogs.promise).mockResolvedValueOnce([])
    const store = useTrainingStore()
    store.setRepository(repository({ getCurriculumLogs }))

    const firstRequest = store.loadHistoryForStudent(1)
    await store.setHistoryPeriod(1, '3m')
    oldLogs.resolve([
      {
        curriculumId: 99,
        date: '2026-07-01',
        achievement: 90,
        trainings: [],
      },
    ])
    await firstRequest

    expect(getCurriculumLogs).toHaveBeenNthCalledWith(
      1,
      1,
      '30d',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(getCurriculumLogs).toHaveBeenNthCalledWith(
      2,
      1,
      '3m',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.period).toBe('3m')
    expect(store.curriculumLogs).toEqual([])
    expect(store.selectedCurriculumId).toBeNull()
  })

  it('통계 오류가 목록·훈련 상세 성공 상태를 숨기지 않는다', async () => {
    const store = useTrainingStore()
    store.setRepository(
      repository({
        getCurriculumLogs: vi.fn().mockResolvedValue([
          {
            curriculumId: 190,
            date: '2026-07-20',
            achievement: 80,
            trainings: [
              {
                trainingId: 901,
                unitName: '파닉스',
                trainingName: '받침 소리 구분',
              },
            ],
          },
        ]),
        getTrainingLog: vi.fn().mockResolvedValue({
          curriculumId: 190,
          trainings: [
            {
              trainingId: 901,
              trainingName: '받침 소리 구분',
              startedAt: null,
              finishedAt: null,
              accuracy: 0,
              questions: [],
            },
          ],
        }),
        getStatistics: vi.fn().mockRejectedValue(new Error('internal details')),
        getTrainingDetail: vi.fn().mockResolvedValue({
          trainingId: 901,
          trainingTemplateId: 12,
          name: '받침 소리 구분',
          form: null,
          generatedData: null,
          status: 'COMPLETED',
          startedAt: null,
          finishedAt: null,
          result: null,
          accuracy: 0,
        }),
      }),
    )

    await store.loadHistoryForStudent(1)

    expect(store.curriculumLogsStatus).toBe('success')
    expect(store.trainingLogStatus).toBe('success')
    expect(store.historyDetailStatus).toBe('success')
    expect(store.statisticsStatus).toBe('error')
    expect(store.statisticsError).toBe('훈련 통계를 불러오지 못했습니다.')
    expect(store.selectedHistoryTraining?.accuracy).toBe(0)
  })

  it('선택한 실제 훈련의 mock 파일을 형식별로 내려받는다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())
    await store.loadHistoryForStudent(1)

    const csv = await store.exportSelectedTraining(1, 'CSV')
    const json = await store.exportSelectedTraining(1, 'JSON')

    expect(csv?.fileName).toBe('training-901-mock.csv')
    expect(json?.fileName).toBe('training-901-mock.json')
    expect(store.exportError).toBeNull()
    expect(store.exportingFormat).toBeNull()
  })

  it('검사 결과에서 전달한 curriculumId로 정확한 추천 커리큘럼을 조회한다', async () => {
    const recommended: DailyCurriculum = {
      ...currentCurriculumFixture,
      curriculumId: 201,
      sourceTestCurriculumId: '1011',
      reviewStatus: 'REVIEW_REQUIRED',
      trainings: currentCurriculumFixture.trainings.map((training) => ({
        ...training,
        status: 'NOT_STARTED' as const,
      })),
    }
    const getCurrentCurriculum = vi.fn()
    const getCurriculum = vi.fn().mockResolvedValue(recommended)
    const store = useTrainingStore()
    store.setRepository(repository({ getCurrentCurriculum, getCurriculum }))

    await store.loadForStudent(1, 201)

    expect(getCurrentCurriculum).not.toHaveBeenCalled()
    expect(getCurriculum).toHaveBeenCalledWith(
      1,
      201,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.savedCurriculum?.sourceTestCurriculumId).toBe('1011')
  })

  it('저장된 최신 교안에 대해서만 최종 검수를 완료하고 응답 상태를 반영한다', async () => {
    const recommended: DailyCurriculum = {
      ...currentCurriculumFixture,
      sourceTestCurriculumId: '1011',
      reviewStatus: 'REVIEW_REQUIRED',
      trainings: currentCurriculumFixture.trainings.map((training) => ({
        ...training,
        status: 'NOT_STARTED' as const,
      })),
    }
    const completeCurriculumReview = vi.fn().mockResolvedValue({
      curriculumId: 201,
      reviewStatus: 'REVIEW_COMPLETED',
      reviewedByTeacherId: 7,
      reviewedAt: '2026-08-01T19:00:00',
    })
    const reviewed = {
      ...recommended,
      reviewStatus: 'REVIEW_COMPLETED' as const,
      reviewedByTeacherId: 7,
      reviewedAt: '2026-08-01T19:00:00',
    }
    const getCurriculum = vi.fn().mockResolvedValueOnce(recommended).mockResolvedValueOnce(reviewed)
    const store = useTrainingStore()
    store.setRepository(
      repository({
        getCurriculum,
        completeCurriculumReview,
      }),
    )
    await store.loadForStudent(1, 201)

    expect(store.canCompleteReview).toBe(true)
    await expect(store.completeCurriculumReview()).resolves.toBe(true)

    expect(completeCurriculumReview).toHaveBeenCalledWith(1, 201)
    expect(getCurriculum).toHaveBeenLastCalledWith(1, 201)
    expect(store.savedCurriculum?.reviewStatus).toBe('REVIEW_COMPLETED')
    expect(store.savedCurriculum?.reviewedByTeacherId).toBe(7)
    expect(store.reviewCompletionStatus).toBe('success')
  })

  it('저장하지 않은 커리큘럼 변경과 409 충돌에서 최종 검수를 차단한다', async () => {
    const recommended: DailyCurriculum = {
      ...currentCurriculumFixture,
      sourceTestCurriculumId: '1011',
      reviewStatus: 'REVIEW_REQUIRED',
      trainings: currentCurriculumFixture.trainings.map((training) => ({
        ...training,
        status: 'NOT_STARTED' as const,
      })),
    }
    const completeCurriculumReview = vi
      .fn()
      .mockRejectedValue(
        new ApiError({ status: 409, code: 'CURRICULUM_NOT_REVIEWABLE', message: 'conflict' }),
      )
    const store = useTrainingStore()
    store.setRepository(
      repository({
        getCurriculum: vi.fn().mockResolvedValue(recommended),
        completeCurriculumReview,
      }),
    )
    await store.loadForStudent(1, 201)
    store.removeDraftItem(store.draftItems[0]!.key)

    expect(store.canCompleteReview).toBe(false)
    await expect(store.completeCurriculumReview()).resolves.toBe(false)
    expect(completeCurriculumReview).not.toHaveBeenCalled()

    store.discardDraft()
    await expect(store.completeCurriculumReview()).resolves.toBe(false)
    expect(store.reviewCompletionError).toContain('최신 내용을 다시 불러온 뒤')
  })

  it.each([
    [403, 'FORBIDDEN', '검수할 권한이 없습니다.'],
    [404, 'CURRICULUM_NOT_FOUND', '추천 커리큘럼을 찾을 수 없습니다.'],
  ])(
    '최종 검수 %i 오류를 교수자가 이해할 수 있는 안내로 변환한다',
    async (status, code, message) => {
      const recommended: DailyCurriculum = {
        ...currentCurriculumFixture,
        sourceTestCurriculumId: '1011',
        reviewStatus: 'REVIEW_REQUIRED',
        trainings: currentCurriculumFixture.trainings.map((training) => ({
          ...training,
          status: 'NOT_STARTED' as const,
        })),
      }
      const store = useTrainingStore()
      store.setRepository(
        repository({
          getCurriculum: vi.fn().mockResolvedValue(recommended),
          completeCurriculumReview: vi
            .fn()
            .mockRejectedValue(new ApiError({ status, code, message: 'internal details' })),
        }),
      )
      await store.loadForStudent(1, 201)

      await expect(store.completeCurriculumReview()).resolves.toBe(false)

      expect(store.reviewCompletionStatus).toBe('error')
      expect(store.reviewCompletionError).toContain(message)
      expect(store.reviewCompletionError).not.toContain('internal')
    },
  )
})

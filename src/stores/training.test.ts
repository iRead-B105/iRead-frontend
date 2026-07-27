import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  MockTrainingRepository,
  type DailyCurriculum,
  type TrainingRepository,
} from '@/features/teacher/training'
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
    getExpectedWords: vi.fn().mockResolvedValue([]),
    addExpectedWord: vi.fn().mockResolvedValue(undefined),
    deleteExpectedWord: vi.fn().mockResolvedValue(undefined),
    getTrainingDetail: vi.fn(),
    getCurriculumLogs: vi.fn().mockResolvedValue([]),
    getTrainingLog: vi.fn(),
    getStatistics: vi.fn(),
    exportTraining: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Training store', () => {
  it('저장된 커리큘럼과 local draft를 분리하고 실제 ID를 유지한다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())

    await store.loadForStudent(1)
    store.selectTemplate(14)
    store.addSelectedTemplate()

    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([
      101,
      102,
      103,
    ])
    expect(store.draftTrainingIds).toEqual([12, 12, 13, 14])
    expect(store.hasChanges).toBe(true)

    await expect(store.saveCurriculum()).resolves.toBe(true)
    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([
      101,
      102,
      103,
      1_000,
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
    store.addSelectedTemplate()

    await expect(store.saveCurriculum()).resolves.toBe(true)
    expect(store.savedCurriculum).toMatchObject({
      status: 'NOT_STARTED',
      trainings: [expect.objectContaining({ trainingTemplateId: 11 })],
    })
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

  it('예상 단어 mutation 실패 시 기존 목록을 유지한다', async () => {
    const mock = new MockTrainingRepository()
    const store = useTrainingStore()
    store.setRepository(mock)
    await store.loadForStudent(1)
    await store.selectDraftItem(1, 'training-101')
    const previousWords = [...store.selectedExpectedWords]

    await expect(store.addExpectedWord('꽃')).resolves.toBe(false)

    expect(store.selectedExpectedWords).toEqual(previousWords)
    expect(store.expectedWordError).toContain('이미 추가된')
  })

  it('reset이 커리큘럼·예상 단어·선택 상태를 모두 비운다', async () => {
    const store = useTrainingStore()
    store.setRepository(new MockTrainingRepository())
    await store.loadForStudent(1)
    await store.selectDraftItem(1, 'training-101')

    store.reset()

    expect(store.currentStudentId).toBeNull()
    expect(store.catalog).toEqual([])
    expect(store.savedCurriculum).toBeNull()
    expect(store.selectedTrainingId).toBeNull()
    expect(store.expectedWordsByTrainingId).toEqual({})
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
    expect(store.statistics?.readingSpeedTrend.unit).toBe(
      'CORRECT_WORDS_PER_MINUTE',
    )
  })

  it('기간을 바꿀 때 늦게 끝난 이전 응답을 무시한다', async () => {
    const oldLogs = deferred<Awaited<ReturnType<TrainingRepository['getCurriculumLogs']>>>()
    const getCurriculumLogs = vi
      .fn()
      .mockReturnValueOnce(oldLogs.promise)
      .mockResolvedValueOnce([])
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
})

import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
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
    getExpectedWords: vi.fn().mockResolvedValue([]),
    addExpectedWord: vi.fn().mockResolvedValue(undefined),
    deleteExpectedWord: vi.fn().mockResolvedValue(undefined),
    getTrainingDetail: vi.fn(),
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

    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([101, 102, 103])
    expect(store.draftTrainingIds).toEqual([12, 12, 13, 14])
    expect(store.hasChanges).toBe(true)

    await expect(store.saveCurriculum()).resolves.toBe(true)
    expect(store.savedCurriculum?.trainings.map((item) => item.trainingId)).toEqual([
      101, 102, 103, 1_000,
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
})

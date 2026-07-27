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
})

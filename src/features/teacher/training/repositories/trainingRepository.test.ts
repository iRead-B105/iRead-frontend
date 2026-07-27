import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { createTrainingApi, type TrainingApi } from '../api'
import { ApiTrainingRepository } from './apiTrainingRepository'
import { MockTrainingRepository } from './mockTrainingRepository'
import { createTrainingRepository } from '.'

function api(overrides: Partial<TrainingApi> = {}): TrainingApi {
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

describe('TrainingRepository factory', () => {
  it('환경 데이터 소스에 맞는 구현만 선택한다', () => {
    const mock = new MockTrainingRepository()
    const apiRepository = new ApiTrainingRepository(api())

    expect(createTrainingRepository('mock', { mock, api: apiRepository })).toBe(mock)
    expect(createTrainingRepository('api', { mock, api: apiRepository })).toBe(apiRepository)
  })
})

describe('ApiTrainingRepository', () => {
  it('NEXT_CURRICULUM_NOT_FOUND만 정상적인 빈 draft로 변환한다', async () => {
    const notFound = new ApiError({
      status: 404,
      code: 'NEXT_CURRICULUM_NOT_FOUND',
      message: '다음 회차 없음',
    })
    const repository = new ApiTrainingRepository(
      api({ getCurrentCurriculum: vi.fn().mockRejectedValue(notFound) }),
    )

    await expect(repository.getCurrentCurriculum(1)).resolves.toBeNull()
  })

  it('권한·서버 오류를 빈 draft로 숨기지 않는다', async () => {
    const forbidden = new ApiError({
      status: 403,
      code: 'STUDENT_FORBIDDEN',
      message: '접근 권한 없음',
    })
    const repository = new ApiTrainingRepository(
      api({ getCurrentCurriculum: vi.fn().mockRejectedValue(forbidden) }),
    )

    await expect(repository.getCurrentCurriculum(1)).rejects.toBe(forbidden)
  })
})

describe('Training API target contract', () => {
  it('저장 요청에 trainingId 배열을 사용하고 POST와 PATCH 응답을 반환한다', async () => {
    const response = {
      curriculumId: 10,
      status: 'NOT_STARTED' as const,
      trainings: [],
    }
    const request = vi.fn().mockResolvedValue(response)
    const trainingApi = createTrainingApi(request)

    await trainingApi.createCurriculum(1, { trainingId: [12, 12, 7] })
    await trainingApi.updateCurriculum(1, 10, { trainingId: [7, 12] })

    expect(request).toHaveBeenNthCalledWith(1, '/api/admin/training/1/curriculum', {
      method: 'POST',
      body: JSON.stringify({ trainingId: [12, 12, 7] }),
    })
    expect(request).toHaveBeenNthCalledWith(2, '/api/admin/training/1/10', {
      method: 'PATCH',
      body: JSON.stringify({ trainingId: [7, 12] }),
    })
  })

  it('예상 단어의 목표 word 필드를 domain wordName으로 변환한다', async () => {
    const request = vi.fn().mockResolvedValue({
      words: [{ wordId: 1, word: '사과' }],
    })
    const trainingApi = createTrainingApi(request)

    await expect(trainingApi.getExpectedWords(1, 101)).resolves.toEqual([
      { wordId: 1, wordName: '사과' },
    ])
  })
})

describe('MockTrainingRepository', () => {
  it('순서 변경과 반복 증감에서 유지된 실제 training ID를 보존한다', async () => {
    const repository = new MockTrainingRepository()

    const updated = await repository.updateCurriculum(1, 201, {
      trainingId: [13, 12, 12, 14],
    })

    expect(updated.trainings.map((training) => training.trainingId)).toEqual([
      103,
      101,
      102,
      1_000,
    ])
    await expect(repository.getExpectedWords(1, 101)).resolves.toEqual([
      { wordId: 1001, wordName: '꽃' },
      { wordId: 1002, wordName: '낮' },
    ])
    await expect(repository.getExpectedWords(1, 102)).resolves.toEqual([
      { wordId: 1003, wordName: '옷' },
    ])
  })

  it('반복 시행별 예상 단어를 독립적으로 관리하고 중복을 거부한다', async () => {
    const repository = new MockTrainingRepository()

    await repository.addExpectedWord(1, 101, '  별  ')

    await expect(repository.getExpectedWords(1, 101)).resolves.toContainEqual(
      expect.objectContaining({ wordName: '별' }),
    )
    await expect(repository.getExpectedWords(1, 102)).resolves.toEqual([
      { wordId: 1003, wordName: '옷' },
    ])
    await expect(repository.addExpectedWord(1, 101, '별')).rejects.toMatchObject({
      status: 400,
      code: 'DUPLICATE_EXPECTED_WORD',
    })
    await expect(repository.getTrainingDetail(1, 101)).resolves.toMatchObject({
      generatedData: null,
      status: 'NOT_READY',
    })
  })

  it('빈 draft는 저장하지 않고 기존 차회가 있으면 중복 생성을 거부한다', async () => {
    const repository = new MockTrainingRepository()

    await expect(repository.createCurriculum(2, { trainingId: [] })).rejects.toMatchObject({
      code: 'EMPTY_CURRICULUM',
    })
    await expect(
      repository.createCurriculum(1, { trainingId: [11] }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'NEXT_CURRICULUM_ALREADY_EXISTS',
    })
  })
})

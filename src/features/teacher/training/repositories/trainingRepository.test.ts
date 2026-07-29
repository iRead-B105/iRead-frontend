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
    getCurriculumLogs: vi.fn().mockResolvedValue([]),
    getTrainingLog: vi.fn(),
    getStatistics: vi.fn(),
    getGazeAnalysis: vi.fn().mockResolvedValue({ status: 'NO_DATA', analysis: null }),
    exportTraining: vi.fn(),
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

  it('시선 분석 404를 분석 데이터 없음 상태로 변환한다', async () => {
    const notFound = new ApiError({
      status: 404,
      code: 'RESOURCE_NOT_FOUND',
      message: '시선 분석 결과를 찾을 수 없습니다.',
    })
    const repository = new ApiTrainingRepository(
      api({ getGazeAnalysis: vi.fn().mockRejectedValue(notFound) }),
    )

    await expect(repository.getGazeAnalysis(1, 10)).resolves.toEqual({
      status: 'NO_DATA',
      analysis: null,
    })
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

  it('기간 query로 curriculum log를 조회하고 최신순으로 정렬한다', async () => {
    const request = vi.fn().mockResolvedValue([
      {
        curriculumId: 10,
        date: '2026-07-01',
        achievementRate: 0,
        trainings: [],
      },
      {
        curriculumId: 12,
        date: '2026-07-20',
        achievementRate: null,
        trainings: [],
      },
    ])
    const trainingApi = createTrainingApi(
      request,
      undefined,
      () => new Date('2026-07-29T12:00:00+09:00'),
    )

    await expect(trainingApi.getCurriculumLogs(7, '3m')).resolves.toEqual([
      expect.objectContaining({ curriculumId: 12, achievement: null }),
      expect.objectContaining({ curriculumId: 10, achievement: 0 }),
    ])
    expect(request).toHaveBeenCalledWith(
      '/api/admin/training/7/curriculum-log?from=2026-04-29&to=2026-07-29',
      {},
    )
  })

  it('training log와 statistics를 목표 endpoint에서 조회한다', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        trainings: [
          {
            trainingId: 901,
            trainingName: '음절 합치기',
            startedAt: '2026-07-20T10:00:00',
            endedAt: '2026-07-20T10:08:00',
            accuracyRate: 80,
            questionResults: [{ questionNumber: 1, isCorrect: false }],
            incorrectItems: [
              {
                questionNumber: 1,
                question: 'ㄱ + ㅏ',
                selectedAnswer: '거',
                correctAnswer: '가',
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        trainings: [
          {
            trainingId: 901,
            trainingName: '음절 합치기',
            date: '2026-07-20',
            accuracyRate: 80,
            previousTrainingDate: '2026-07-01',
            previousAccuracyRate: 70,
          },
        ],
      })
      .mockResolvedValueOnce({
        unit: 'WORDS_PER_MINUTE',
        voiceChangeRate: 20,
        points: [
          { date: '2026-07-20', voiceSpeed: 60 },
          { date: '2026-07-01', voiceSpeed: 50 },
          { date: '2026-07-15', voiceSpeed: null },
        ],
      })
    const trainingApi = createTrainingApi(
      request,
      undefined,
      () => new Date('2026-07-29T12:00:00+09:00'),
    )

    const log = await trainingApi.getTrainingLog(7, 10)
    const statistics = await trainingApi.getStatistics(7, 10, '30d')

    expect(request).toHaveBeenNthCalledWith(1, '/api/admin/training/7/10/training-log', {})
    expect(request).toHaveBeenNthCalledWith(2, '/api/admin/training/7/10/statistics', {})
    expect(request).toHaveBeenNthCalledWith(
      3,
      '/api/admin/student/7/reading-speed-trend?from=2026-06-30&to=2026-07-29',
      {},
    )
    expect(log).toEqual({
      curriculumId: 10,
      trainings: [
        expect.objectContaining({
          trainingId: 901,
          finishedAt: '2026-07-20T10:08:00',
          accuracy: 80,
          questions: [
            {
              questionNumber: 1,
              question: 'ㄱ + ㅏ',
              isCorrect: false,
              selectedAnswer: '거',
              correctAnswer: '가',
            },
          ],
        }),
      ],
    })
    expect(statistics.accuracyComparisons[0]).toMatchObject({
      trainingId: 901,
      accuracy: 80,
      previousAccuracy: 70,
    })
    expect(statistics.readingSpeedTrend).toMatchObject({
      changeRate: 20,
      points: [
        { date: '2026-07-01', speed: 50 },
        { date: '2026-07-20', speed: 60 },
      ],
    })
  })

  it('실제 studentId와 trainingId로 시선 분석 상태를 조회한다', async () => {
    const request = vi.fn().mockResolvedValue({
      gazeSessionId: 61,
      gazeAnalysisId: 71,
      totalDwellTime: 1_500,
      dwellCount: 4,
      regressionCount: 1,
      averageFixationTime: null,
    })
    const trainingApi = createTrainingApi(request)

    await expect(trainingApi.getGazeAnalysis(7, 901)).resolves.toMatchObject({
      status: 'AVAILABLE',
      analysis: { avgVisitedDurationMs: null },
    })
    expect(request).toHaveBeenCalledWith('/api/admin/training/7/901/gaze-analysis', {})
  })

  it('CSV와 JSON을 대문자 format의 공통 binary download로 요청한다', async () => {
    const request = vi.fn()
    const download = vi.fn().mockResolvedValue({
      blob: new Blob(['fixture']),
      fileName: 'fixture.csv',
      contentType: 'text/csv',
    })
    const trainingApi = createTrainingApi(request, download)

    await trainingApi.exportTraining(7, 901, 'CSV')
    await trainingApi.exportTraining(7, 901, 'JSON')

    expect(download).toHaveBeenNthCalledWith(1, '/api/admin/training/7/901/export?format=CSV', {
      method: 'POST',
    })
    expect(download).toHaveBeenNthCalledWith(2, '/api/admin/training/7/901/export?format=JSON', {
      method: 'POST',
    })
  })
})

describe('MockTrainingRepository', () => {
  it('순서 변경과 반복 증감에서 유지된 실제 training ID를 보존한다', async () => {
    const repository = new MockTrainingRepository()

    const updated = await repository.updateCurriculum(1, 201, {
      trainingId: [13, 12, 12, 14],
    })

    expect(updated.trainings.map((training) => training.trainingId)).toEqual([103, 101, 102, 1_000])
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
    await expect(repository.createCurriculum(1, { trainingId: [11] })).rejects.toMatchObject({
      status: 409,
      code: 'NEXT_CURRICULUM_ALREADY_EXISTS',
    })
  })

  it('기간별 완료 커리큘럼과 실제 훈련 상세를 분리해 반환한다', async () => {
    const repository = new MockTrainingRepository()

    const thirtyDays = await repository.getCurriculumLogs(1, '30d')
    const threeMonths = await repository.getCurriculumLogs(1, '3m')
    const log = await repository.getTrainingLog(1, 190)
    const detail = await repository.getTrainingDetail(1, 901)

    expect(thirtyDays.map((item) => item.curriculumId)).toEqual([190, 189])
    expect(threeMonths.map((item) => item.curriculumId)).toEqual([190, 189, 180])
    expect(log.trainings[0]).toMatchObject({ trainingId: 901, accuracy: 80 })
    expect(detail).toMatchObject({
      trainingId: 901,
      status: 'COMPLETED',
      accuracy: 80,
    })
  })

  it('훈련별 AVAILABLE·NO_DATA·FAILED 시선 상태를 그대로 반환한다', async () => {
    const repository = new MockTrainingRepository()

    await expect(repository.getGazeAnalysis(1, 901)).resolves.toMatchObject({
      status: 'AVAILABLE',
    })
    await expect(repository.getGazeAnalysis(1, 902)).resolves.toEqual({
      status: 'NO_DATA',
      analysis: null,
    })
    await expect(repository.getGazeAnalysis(1, 903)).resolves.toEqual({
      status: 'FAILED',
      analysis: null,
    })
    await expect(repository.getGazeAnalysis(2, 901)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('mock CSV와 JSON 다운로드를 실제 Backend 파일과 구분한다', async () => {
    const repository = new MockTrainingRepository()

    const csv = await repository.exportTraining(1, 901, 'CSV')
    const json = await repository.exportTraining(1, 901, 'JSON')

    expect(csv.fileName).toBe('training-901-mock.csv')
    expect(csv.contentType).toContain('text/csv')
    expect(json.fileName).toBe('training-901-mock.json')
    expect(json.contentType).toContain('application/json')
    expect(await csv.blob.text()).toContain('trainingId')
  })
})

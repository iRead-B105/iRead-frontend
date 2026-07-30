import { describe, expect, it, vi } from 'vitest'
import { createStudentApi } from './api'

describe('Student API', () => {
  it('상세 조회의 id와 객체형 주소를 화면 모델로 변환한다', async () => {
    const request = vi.fn().mockResolvedValue({
      id: 7,
      name: '김하늘',
      birthday: '2018-03-15',
      gender: 'Boy',
      school: '새봄초등학교',
      guardian: '김보호',
      guardianContact: '010-0000-0000',
      guardianEmail: null,
      address: [{ value: '서울시 강남구' }, { value: '테헤란로 1' }],
      createdAt: '2026-03-01T09:00:00+09:00',
      imageUrl: null,
      teacherMemo: null,
    })
    const api = createStudentApi(request)

    await expect(api.getDetail(7)).resolves.toMatchObject({
      studentId: 7,
      address: '서울시 강남구 테헤란로 1',
      createdAt: '2026-03-01T09:00:00+09:00',
    })
    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      signal: undefined,
    })
  })

  it('상세 조회의 nullable 필드와 빈 선택 문자열을 화면의 null로 정규화한다', async () => {
    const request = vi.fn().mockResolvedValue({
      id: 8,
      name: '이바다',
      birthday: null,
      gender: null,
      school: null,
      guardian: null,
      guardianContact: null,
      guardianEmail: '',
      address: [],
      createdAt: '2026-03-01T09:00:00+09:00',
      imageUrl: null,
      teacherMemo: null,
    })
    const api = createStudentApi(request)

    await expect(api.getDetail(8)).resolves.toEqual({
      studentId: 8,
      name: '이바다',
      birthday: null,
      gender: null,
      school: null,
      guardian: null,
      guardianContact: null,
      guardianEmail: null,
      address: null,
      createdAt: '2026-03-01T09:00:00+09:00',
      imageUrl: null,
      teacherMemo: null,
    })
  })

  it('이미지가 없는 등록은 JSON body로 요청한다', async () => {
    const request = vi.fn().mockResolvedValue({ studentId: 13 })
    const api = createStudentApi(request)
    const input = {
      name: '새아동',
      birthday: '2019-01-02',
      gender: 'Girl' as const,
      school: '새봄초등학교',
      guardian: '보호자',
      guardianContact: '010-1234-5678',
      guardianEmail: null,
      address: null,
    }

    await expect(api.create({ input })).resolves.toBe(13)
    expect(request).toHaveBeenCalledWith('/api/admin/student', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  })

  it('이미지가 있는 등록은 request JSON Blob과 image만 담은 multipart로 요청한다', async () => {
    const request = vi.fn().mockResolvedValue({ studentId: 13 })
    const api = createStudentApi(request)
    const input = {
      name: '새아동',
      birthday: '2019-01-02',
      gender: 'Girl' as const,
      school: '새봄초등학교',
      guardian: '보호자',
      guardianContact: '010-1234-5678',
    }
    const image = new File(['image'], 'profile.png', { type: 'image/png' })

    await api.create({ input, image })

    const init = request.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.headers).toBeUndefined()
    expect(init.body).toBeInstanceOf(FormData)
    const body = init.body as FormData
    expect(await (body.get('request') as Blob).text()).toBe(JSON.stringify(input))
    expect(body.get('image')).toBe(image)
  })

  it('수정은 변경 필드만 PATCH하고 선택 필드 삭제를 백엔드용 값으로 변환한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = createStudentApi(request)

    await api.update(7, {
      input: {
        school: '푸른초등학교',
        guardianEmail: null,
        address: null,
      },
    })

    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      method: 'PATCH',
      body: JSON.stringify({
        school: '푸른초등학교',
        guardianEmail: '',
        address: [],
      }),
    })
  })

  it('이미지와 함께 수정할 때도 삭제 Adapter를 multipart request에 적용한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = createStudentApi(request)
    const image = new File(['image'], 'profile.png', { type: 'image/png' })

    await api.update(7, {
      input: { guardianEmail: null, address: null },
      image,
    })

    const init = request.mock.calls[0]?.[1] as RequestInit
    const body = init.body as FormData
    expect(init.method).toBe('PATCH')
    expect(await (body.get('request') as Blob).text()).toBe(
      JSON.stringify({ guardianEmail: '', address: [] }),
    )
    expect(body.get('image')).toBe(image)
  })

  it('삭제는 대상 id의 DELETE endpoint를 사용한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = createStudentApi(request)

    await api.remove(7)

    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      method: 'DELETE',
    })
  })

  it('학습 summary와 단일 메모 저장은 목표 endpoint를 사용한다', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        studentId: 7,
        currentStage: '문장 이해력 향상',
        lastLearningAt: '2026-07-27T16:00:00+09:00',
        attentionRequiredCount: 0,
        attentionReasons: [],
      })
      .mockResolvedValueOnce(undefined)
    const api = createStudentApi(request)

    await api.getLearningSummary(7)
    await api.updateTeacherMemo(7, null)

    expect(request).toHaveBeenNthCalledWith(1, '/api/admin/student/7/learning-summary', {
      signal: undefined,
    })
    expect(request).toHaveBeenNthCalledWith(2, '/api/admin/student/7', {
      method: 'PATCH',
      body: JSON.stringify({ teacherMemo: '' }),
    })
  })

  it('교수자 메모 문자열만 범용 학생 PATCH body로 전송한다', async () => {
    const request = vi.fn().mockResolvedValue(undefined)
    const api = createStudentApi(request)

    await api.updateTeacherMemo(7, '받침 읽기 연습 필요')

    expect(request).toHaveBeenCalledWith('/api/admin/student/7', {
      method: 'PATCH',
      body: JSON.stringify({ teacherMemo: '받침 읽기 연습 필요' }),
    })
  })

  it('훈련 이력 accuracyRate를 화면의 achievement로 변환한다', async () => {
    const request = vi.fn().mockResolvedValue({
      learningHistory: [
        {
          trainingId: 91,
          date: '2026-07-28',
          learningType: '음절 합쳐 낱말 만들기',
          learningCategory: '글자 만들기',
          startedAt: '2026-07-28T10:00:00',
          finishedAt: '2026-07-28T10:08:00',
          accuracyRate: 82.5,
          questions: [
            {
              questionNumber: 1,
              question: '가와 나를 합치면?',
              correct: true,
              selectedAnswer: '가나',
              correctAnswer: '가나',
            },
          ],
        },
      ],
    })
    const api = createStudentApi(request, () => new Date('2026-07-29T12:00:00+09:00'))

    await expect(api.getTrainingHistory(7, '30d')).resolves.toEqual({
      learningHistory: [
        expect.objectContaining({
          trainingId: 91,
          achievement: 82.5,
        }),
      ],
    })
  })

  it('정확도 추이 accuracyRate를 화면의 accuracy로 변환한다', async () => {
    const request = vi.fn().mockResolvedValue({
      dailyAccuracy: [
        {
          date: '2026-07-28',
          accuracyRate: 84.5,
        },
      ],
    })
    const api = createStudentApi(request)

    await expect(api.getAccuracyTrend(7)).resolves.toEqual({
      dailyAccuracy: [
        {
          date: '2026-07-28',
          accuracy: 84.5,
        },
      ],
    })
  })

  it('읽기 속도 응답에서 음성 속도만 화면 모델로 정규화한다', async () => {
    const request = vi.fn().mockResolvedValue({
      unit: 'WORDS_PER_MINUTE',
      voiceChangeRate: 12.5,
      gazeChangeRate: 4.2,
      points: [
        { date: '2026-07-28', voiceSpeed: 96, gazeSpeed: 88 },
        { date: '2026-07-27', voiceSpeed: null, gazeSpeed: 82 },
        { date: '2026-07-20', voiceSpeed: 84, gazeSpeed: null },
      ],
    })
    const api = createStudentApi(request, () => new Date('2026-07-29T12:00:00+09:00'))

    await expect(api.getReadingSpeedTrend(7)).resolves.toEqual({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: 12.5,
      points: [
        { date: '2026-07-20', speed: 84 },
        { date: '2026-07-28', speed: 96 },
      ],
    })
  })

  it('학습 이벤트·정확도·읽기 속도·기간별 훈련 이력은 목표 계약 경로를 사용한다', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ events: [] })
      .mockResolvedValueOnce({
        eventId: 701,
        eventType: 'TRAINING',
        occurredAt: '2026-07-27T16:00:00+09:00',
        sourceId: 91,
        accuracy: 68,
        retryCount: 2,
        problemSegments: [],
        attentionRequired: false,
        attentionReasons: [],
        recommendedTrainingTemplateId: null,
        recommendedCurriculumUnitId: null,
        recommendedCurriculumUnitName: null,
        recommendationReason: null,
        recommendedMinutes: null,
        recommendedRepeatCount: null,
      })
      .mockResolvedValueOnce({ dailyAccuracy: [] })
      .mockResolvedValueOnce({ unit: 'WORDS_PER_MINUTE', voiceChangeRate: null, points: [] })
      .mockResolvedValueOnce({ learningHistory: [] })
    const api = createStudentApi(request, () => new Date('2026-07-29T12:00:00+09:00'))

    await api.listLearningEvents(7, { limit: 3 })
    await api.getLearningEvent(7, 'TRAINING', 701)
    await api.getAccuracyTrend(7)
    await api.getReadingSpeedTrend(7)
    await api.getTrainingHistory(7, '3m')

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/api/admin/student/7/learning-events/recent?limit=3',
      { signal: undefined },
    )
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/api/admin/student/7/learning-events?eventType=training&eventId=701',
      { signal: undefined },
    )
    expect(request).toHaveBeenNthCalledWith(3, '/api/admin/student/7/accuracy-trend', {
      signal: undefined,
    })
    expect(request).toHaveBeenNthCalledWith(
      4,
      '/api/admin/student/7/reading-speed-trend?from=2026-06-30&to=2026-07-29',
      { signal: undefined },
    )
    expect(request).toHaveBeenNthCalledWith(
      5,
      '/api/admin/student/7/training-history?from=2026-04-29&to=2026-07-29',
      { signal: undefined },
    )
  })

  it('보고서 달력의 명시적인 기간으로 훈련 이력을 조회한다', async () => {
    const request = vi.fn().mockResolvedValue({ learningHistory: [] })
    const api = createStudentApi(request)

    await api.getTrainingHistory(7, { from: '2026-06-01', to: '2026-06-30' })

    expect(request).toHaveBeenCalledWith(
      '/api/admin/student/7/training-history?from=2026-06-01&to=2026-06-30',
      { signal: undefined },
    )
  })
})

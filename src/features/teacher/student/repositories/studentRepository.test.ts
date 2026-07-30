import { describe, expect, it, vi } from 'vitest'
import { createStudentApi } from '../api'
import { studentFixtures } from '../fixtures'
import { ApiStudentRepository } from './apiStudentRepository'
import { MockStudentRepository } from './mockStudentRepository'
import { createStudentRepository } from '.'

describe('StudentRepository factory', () => {
  it('데이터 소스에 맞는 구현만 선택한다', () => {
    const mock = new MockStudentRepository()
    const api = new ApiStudentRepository()
    expect(createStudentRepository('mock', { mock, api })).toBe(mock)
    expect(createStudentRepository('api', { mock, api })).toBe(api)
  })
})

describe('ApiStudentRepository', () => {
  it('목표 목록 query와 summary endpoint를 공통 client에 전달한다', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        students: [],
        page: 0,
        size: 10,
        totalElements: 0,
        totalPages: 0,
      })
      .mockResolvedValueOnce({ totalStudents: 0, scheduledTodayCount: 0 })
    const repository = new ApiStudentRepository(createStudentApi(request))

    await repository.list({ keyword: ' 학교 ', page: 0 })
    await repository.getSummary()

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/api/admin/student/list?keyword=%ED%95%99%EA%B5%90&page=0&size=10',
      { signal: undefined },
    )
    expect(request).toHaveBeenNthCalledWith(2, '/api/admin/student/summary', {
      signal: undefined,
    })
  })
})

describe('MockStudentRepository', () => {
  const repository = new MockStudentRepository(
    studentFixtures,
    () => new Date('2026-07-27T12:00:00'),
  )

  it('이름·학교 검색과 metadata를 같은 계약으로 반환한다', async () => {
    const byName = await repository.list({ keyword: '하늘' })
    const bySchool = await repository.list({ keyword: '새봄', size: 2 })

    expect(byName.students.map((student) => student.studentId)).toEqual([1])
    expect(bySchool.students).toHaveLength(2)
    expect(bySchool.totalElements).toBe(3)
    expect(bySchool.totalPages).toBe(2)
  })

  it('최근 학습 없음은 기간 filter에서 제외하고 0-based page를 사용한다', async () => {
    const recent = await repository.list({ recentDays: 7, page: 1, size: 2 })

    expect(recent.page).toBe(1)
    expect(recent.students).toHaveLength(2)
    expect(recent.students.every((student) => student.recentLearningDate !== null)).toBe(true)
  })

  it('summary는 검색과 무관한 전체 두 값만 반환한다', async () => {
    await expect(repository.getSummary()).resolves.toEqual({
      totalStudents: 12,
      scheduledTodayCount: 6,
    })
  })

  it('등록·부분 수정·삭제가 목록과 상세에 같은 상태로 반영된다', async () => {
    const mutableRepository = new MockStudentRepository([], () => new Date('2026-07-27T12:00:00'))
    const studentId = await mutableRepository.create({
      input: {
        name: '새아동',
        birthday: '2019-01-02',
        gender: 'Girl',
        school: '새봄초등학교',
        guardian: '보호자',
        guardianContact: '010-1234-5678',
        guardianEmail: 'guardian@example.com',
        address: '서울시',
      },
    })

    await expect(mutableRepository.getSummary()).resolves.toMatchObject({ totalStudents: 1 })
    await mutableRepository.update(studentId, {
      input: { school: '푸른초등학교', guardianEmail: null, address: null },
    })
    await expect(mutableRepository.getDetail(studentId)).resolves.toMatchObject({
      school: '푸른초등학교',
      guardianEmail: null,
      address: null,
    })

    await mutableRepository.remove(studentId)
    await expect(mutableRepository.getSummary()).resolves.toMatchObject({ totalStudents: 0 })
    await expect(mutableRepository.getDetail(studentId)).rejects.toMatchObject({ status: 404 })
  })

  it('학습 이력이 없는 아동은 NO_HISTORY를 주의 건수에 포함하지 않는다', async () => {
    const summary = await repository.getLearningSummary(3)

    expect(summary).toEqual({
      studentId: 3,
      currentStage: null,
      lastLearningAt: null,
      attentionRequiredCount: 0,
      attentionReasons: ['NO_HISTORY'],
    })
  })

  it('최근 이벤트 3건을 최신순으로 반환하고 실제 eventId로 상세를 조회한다', async () => {
    const events = await repository.listLearningEvents(1, { limit: 3 })

    expect(events.map((event) => event.eventId)).toEqual([1104, 1103, 1102])
    await expect(repository.getLearningEvent(1, 'TRAINING', 1104)).resolves.toMatchObject({
      eventId: 1104,
      recommendedTrainingTemplateId: 301,
      recommendedMinutes: 10,
      recommendedRepeatCount: 2,
    })
    await expect(repository.getLearningEvent(1, 'GAZE', 1103)).resolves.toMatchObject({
      eventId: 1103,
      accuracy: null,
      problemSegments: [],
      recommendedTrainingTemplateId: null,
    })
    await expect(repository.getLearningEvent(1, 'TRAINING', 9999)).rejects.toMatchObject({
      status: 404,
    })
  })

  it('정확도 0건·1건·여러 건 fixture를 날짜 오름차순으로 반환한다', async () => {
    const empty = await repository.getAccuracyTrend(3)
    const single = await repository.getAccuracyTrend(2)
    const multiple = await repository.getAccuracyTrend(1)

    expect(empty.dailyAccuracy).toEqual([])
    expect(single.dailyAccuracy).toHaveLength(1)
    expect(multiple.dailyAccuracy).toHaveLength(6)
    expect(multiple.dailyAccuracy.map((point) => point.date)).toEqual(
      [...multiple.dailyAccuracy].map((point) => point.date).sort(),
    )
  })

  it('Mock 읽기 속도도 API와 같은 화면 모델과 날짜 오름차순으로 반환한다', async () => {
    const empty = await repository.getReadingSpeedTrend(3)
    const multiple = await repository.getReadingSpeedTrend(1)

    expect(empty).toEqual({
      unit: 'CORRECT_WORDS_PER_MINUTE',
      changeRate: null,
      points: [],
    })
    expect(multiple.unit).toBe('CORRECT_WORDS_PER_MINUTE')
    expect(multiple.points).toHaveLength(4)
    expect(multiple.points.map((point) => point.date)).toEqual(
      [...multiple.points].map((point) => point.date).sort(),
    )
  })

  it('훈련 이력의 30일·3개월 기간을 구분하고 최신순으로 반환한다', async () => {
    const recent = await repository.getTrainingHistory(1, '30d')
    const quarter = await repository.getTrainingHistory(1, '3m')

    expect(recent.learningHistory.map((item) => item.trainingId)).toEqual([9105, 9104, 9103])
    expect(quarter.learningHistory.map((item) => item.trainingId)).toEqual([9105, 9104, 9103, 9102])
  })

  it('명시적인 날짜 범위에서는 종료일 이후 기록도 제외한다', async () => {
    const history = await repository.getTrainingHistory(1, {
      from: '2026-07-01',
      to: '2026-07-21',
    })

    expect(history.learningHistory.map((item) => item.trainingId)).toEqual([9104, 9103])
  })

  it('단일 교수자 메모를 저장하고 null로 삭제한다', async () => {
    const mutableRepository = new MockStudentRepository(studentFixtures)

    await mutableRepository.updateTeacherMemo(1, '받침 읽기 연습 필요')
    await expect(mutableRepository.getDetail(1)).resolves.toMatchObject({
      teacherMemo: '받침 읽기 연습 필요',
    })

    await mutableRepository.updateTeacherMemo(1, null)
    await expect(mutableRepository.getDetail(1)).resolves.toMatchObject({
      teacherMemo: null,
    })
  })
})

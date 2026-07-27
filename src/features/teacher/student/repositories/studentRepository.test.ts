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
    const request = vi.fn()
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
  const repository = new MockStudentRepository(studentFixtures, () => new Date('2026-07-27T12:00:00'))

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
})

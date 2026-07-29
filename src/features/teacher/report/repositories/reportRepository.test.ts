import { describe, expect, it, vi } from 'vitest'
import { createReportApi, type ReportApi } from '../api'
import {
  refreshedReportGazeTrendFixture,
  reportFixtures,
} from '../fixtures'
import { ApiReportRepository } from './apiReportRepository'
import { MockReportRepository } from './mockReportRepository'
import { createReportRepository } from '.'

function api(overrides: Partial<ReportApi> = {}): ReportApi {
  return {
    listByStudent: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    get: vi.fn(),
    updateTeacherMemo: vi.fn(),
    refreshGazeTrend: vi.fn(),
    ...overrides,
  }
}

describe('ReportRepository factory', () => {
  it('환경 데이터 소스에 맞는 구현만 선택한다', () => {
    const mock = new MockReportRepository({ delayMs: 0 })
    const apiRepository = new ApiReportRepository(api())

    expect(createReportRepository('mock', { mock, api: apiRepository })).toBe(mock)
    expect(createReportRepository('api', { mock, api: apiRepository })).toBe(apiRepository)
  })
})

describe('ApiReportRepository', () => {
  it('목록 조회에 studentId와 AbortSignal을 전달한다', async () => {
    const listByStudent = vi.fn().mockResolvedValue([])
    const repository = new ApiReportRepository(api({ listByStudent }))
    const controller = new AbortController()

    await repository.listByStudent(3, { signal: controller.signal })

    expect(listByStudent).toHaveBeenCalledWith(3, { signal: controller.signal })
  })
})

describe('Report API target contract', () => {
  it('목록·생성·상세·의견·시선 갱신에 목표 endpoint와 body를 사용한다', async () => {
    const detail = reportFixtures[0]!
    const request = vi
      .fn()
      .mockResolvedValueOnce([
        {
          reportId: detail.reportId,
          studentId: detail.studentId,
          startDate: detail.startDate,
          endDate: detail.endDate,
          createdAt: detail.createdAt,
        },
      ])
      .mockResolvedValueOnce({ reportId: 3001, createdAt: '2026-07-28T10:00:00+09:00' })
      .mockResolvedValueOnce(detail)
      .mockResolvedValueOnce({
        reportId: detail.reportId,
        teacherMemo: null,
        createdAt: detail.createdAt,
      })
      .mockResolvedValueOnce({ reportId: detail.reportId })
    const reportApi = createReportApi(request)
    const controller = new AbortController()

    await reportApi.listByStudent(1, { signal: controller.signal })
    await reportApi.create({
      studentId: 1,
      startDate: '2026-07-01',
      endDate: '2026-07-27',
      teacherMemo: null,
    })
    await reportApi.get(detail.reportId)
    await reportApi.updateTeacherMemo(detail.reportId, null)
    await reportApi.refreshGazeTrend(detail.reportId)

    expect(request).toHaveBeenNthCalledWith(
      1,
      '/api/admin/report?studentId=1',
      { signal: controller.signal },
    )
    expect(request).toHaveBeenNthCalledWith(2, '/api/admin/report', {
      method: 'POST',
      body: JSON.stringify({
        studentId: 1,
        startDate: '2026-07-01',
        endDate: '2026-07-27',
        teacherMemo: null,
      }),
    })
    expect(request).toHaveBeenNthCalledWith(3, `/api/admin/report/${detail.reportId}`, {})
    expect(request).toHaveBeenNthCalledWith(
      4,
      `/api/admin/report/${detail.reportId}/teacher-memo`,
      {
        method: 'PATCH',
        body: JSON.stringify({ teacherMemo: null }),
      },
    )
    expect(request).toHaveBeenNthCalledWith(
      5,
      `/api/admin/report/${detail.reportId}/gaze-analysis`,
      { method: 'POST' },
    )
  })

  it('상세의 growth와 gaze point를 시간순으로 정렬한다', async () => {
    const detail = reportFixtures[0]!
    const request = vi.fn().mockResolvedValue({
      ...detail,
      snapshot: {
        ...detail.snapshot,
        growthHistory: [...detail.snapshot.growthHistory].reverse(),
        gazeTrend: {
          ...detail.snapshot.gazeTrend,
          training: {
            ...detail.snapshot.gazeTrend.training,
            points: [...detail.snapshot.gazeTrend.training.points].reverse(),
          },
        },
      },
    })
    const reportApi = createReportApi(request)

    const result = await reportApi.get(detail.reportId)

    expect(result.snapshot.growthHistory.map((point) => point.date)).toEqual([
      '2026-07-03',
      '2026-07-12',
      '2026-07-24',
    ])
    expect(
      result.snapshot.gazeTrend.training.points.map(
        (point) => point.gazeAnalysisResultId,
      ),
    ).toEqual([7101, 7102, 7103])
  })

  it('Backend 저장 스냅샷에 gazeTrend가 없어도 상세 보고서를 연다', async () => {
    const detail = reportFixtures[0]!
    const { gazeTrend: _gazeTrend, ...storedSnapshot } = detail.snapshot
    const request = vi.fn().mockResolvedValue({
      ...detail,
      snapshot: {
        ...storedSnapshot,
        gazeAnalysis: null,
      },
    })
    const reportApi = createReportApi(request)

    const result = await reportApi.get(detail.reportId)

    expect(result.snapshot.gazeTrend).toEqual({
      generatedAt: detail.createdAt,
      training: {
        status: 'NO_DATA',
        comparisonAvailable: false,
        points: [],
        changes: null,
        descriptions: [],
        failedSessionCount: 0,
      },
      test: {
        status: 'NO_DATA',
        comparisonAvailable: false,
        points: [],
        changes: null,
        descriptions: [],
        failedSessionCount: 0,
      },
    })
  })
})

describe('MockReportRepository', () => {
  const options = {
    delayMs: 0,
    now: () => new Date('2026-07-28T10:00:00+09:00'),
  }

  it('학습자별 목록을 createdAt 최신순으로 반환한다', async () => {
    const repository = new MockReportRepository(options)

    const reports = await repository.listByStudent(1)

    expect(reports.map((report) => report.reportId)).toEqual([1002, 1001])
    expect(reports.every((report) => report.studentId === 1)).toBe(true)
    expect(reports[0]).not.toHaveProperty('snapshot')
  })

  it('학습 데이터 없음과 같은 기간 중복을 서로 다른 오류로 반환한다', async () => {
    const repository = new MockReportRepository(options)

    await expect(
      repository.create({
        studentId: 3,
        startDate: '2026-07-01',
        endDate: '2026-07-28',
      }),
    ).rejects.toMatchObject({ code: 'REPORT_DATA_NOT_FOUND' })
    await expect(
      repository.create({
        studentId: 1,
        startDate: '2026-07-01',
        endDate: '2026-07-27',
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'REPORT_PERIOD_ALREADY_EXISTS',
    })
  })

  it('생성 결과와 상세을 분리하고 목록에 새 보고서를 반영한다', async () => {
    const repository = new MockReportRepository(options)

    const created = await repository.create({
      studentId: 1,
      startDate: '2026-07-03',
      endDate: '2026-07-24',
      teacherMemo: '  새 의견  ',
    })
    const detail = await repository.get(created.reportId)
    const list = await repository.listByStudent(1)

    expect(created).toEqual({
      reportId: 2002,
      createdAt: '2026-07-28T01:00:00.000Z',
    })
    expect(detail).toMatchObject({
      reportId: created.reportId,
      teacherMemo: '새 의견',
    })
    expect(list[0]?.reportId).toBe(created.reportId)
  })

  it('공백 의견을 null로 삭제하고 createdAt을 유지한다', async () => {
    const repository = new MockReportRepository(options)
    const before = await repository.get(1002)

    const result = await repository.updateTeacherMemo(1002, ' \n ')
    const after = await repository.get(1002)

    expect(result.teacherMemo).toBeNull()
    expect(result.createdAt).toBe(before.createdAt)
    expect(after.teacherMemo).toBeNull()
    expect(after.createdAt).toBe(before.createdAt)
  })

  it('시선 갱신은 gazeTrend만 교체하고 같은 요청에 중복 point를 만들지 않는다', async () => {
    const repository = new MockReportRepository(options)
    const before = await repository.get(1002)

    await repository.refreshGazeTrend(1002)
    await repository.refreshGazeTrend(1002)
    const after = await repository.get(1002)

    expect(after.snapshot.gazeTrend).toEqual(refreshedReportGazeTrendFixture)
    expect(after.snapshot.gazeTrend.training.points).toHaveLength(4)
    expect(after.snapshot.gazeTrend.training.descriptions).toContain(
      '되돌아보기 횟수는 7회에서 5회로 2회 감소했습니다.',
    )
    expect({
      ...after.snapshot,
      gazeTrend: before.snapshot.gazeTrend,
    }).toEqual(before.snapshot)
  })
})

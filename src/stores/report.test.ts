import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  type ReportDetail,
  type ReportListItem,
  type ReportRepository,
} from '@/features/teacher/report'
import { reportFixtures } from '@/test/fixtures/report'
import { TestReportRepository } from '@/test/repositories'
import { ApiError } from '@/lib/api'
import { useReportStore } from './report'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

function repository(overrides: Partial<ReportRepository> = {}): ReportRepository {
  return {
    listByStudent: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    get: vi.fn(),
    updateTeacherMemo: vi.fn(),
    refreshGazeTrend: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('Report store', () => {
  it('보고서 목록 재조회 실패 시 이전 목록을 유지한다', async () => {
    const listByStudent = vi
      .fn()
      .mockResolvedValueOnce([reportFixtures[0]!])
      .mockRejectedValueOnce(
        new ApiError({
          status: 500,
          code: 'INTERNAL_ERROR',
          message: 'internal details',
        }),
      )
    const store = useReportStore()
    store.setRepository(repository({ listByStudent }))
    await store.loadForStudent(1)
    const previousReports = store.reports

    await store.loadList(1)

    expect(store.listStatus).toBe('error')
    expect(store.reports).toBe(previousReports)
    expect(store.listError).not.toContain('internal')
    expect(store.listUiError?.kind).toBe('server')
  })

  it('학습자 변경 중 늦게 끝난 이전 목록 응답을 무시한다', async () => {
    const oldList = deferred<readonly ReportListItem[]>()
    const newList = [reportFixtures[2]!]
    const listByStudent = vi
      .fn()
      .mockReturnValueOnce(oldList.promise)
      .mockResolvedValueOnce(newList)
    const store = useReportStore()
    store.setRepository(repository({ listByStudent }))

    const previous = store.loadForStudent(1)
    await store.loadForStudent(2)
    oldList.resolve([reportFixtures[0]!])
    await previous

    expect(store.activeStudentId).toBe(2)
    expect(store.reports.map((report) => report.reportId)).toEqual([2001])
  })

  it('보고서 생성 후 상세 GET을 거쳐 목록을 다시 조회한다', async () => {
    const created = { reportId: 3001, createdAt: '2026-07-28T10:00:00+09:00' }
    const detail: ReportDetail = {
      ...reportFixtures[0]!,
      reportId: created.reportId,
      startDate: '2026-07-03',
      endDate: '2026-07-24',
      createdAt: created.createdAt,
    }
    const create = vi.fn().mockResolvedValue(created)
    const get = vi.fn().mockResolvedValue(detail)
    const listByStudent = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([detail])
    const store = useReportStore()
    store.setRepository(repository({ create, get, listByStudent }))
    await store.loadForStudent(1)
    store.startDate = '2026-07-03'
    store.endDate = '2026-07-24'

    await expect(store.createReport(1)).resolves.toBe(true)

    expect(create).toHaveBeenCalledWith({
      studentId: 1,
      startDate: '2026-07-03',
      endDate: '2026-07-24',
    })
    expect(get).toHaveBeenCalledWith(
      created.reportId,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.selectedReport?.reportId).toBe(created.reportId)
    expect(store.reports[0]?.reportId).toBe(created.reportId)
  })

  it('POST 성공 후 상세 GET 실패 시 reportId와 기간 입력을 유지한다', async () => {
    const store = useReportStore()
    store.setRepository(
      repository({
        listByStudent: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({
          reportId: 3002,
          createdAt: '2026-07-28T10:00:00+09:00',
        }),
        get: vi.fn().mockRejectedValue(new Error('상세 조회 실패')),
      }),
    )
    await store.loadForStudent(1)
    store.startDate = '2026-07-03'
    store.endDate = '2026-07-24'

    await expect(store.createReport(1)).resolves.toBe(false)

    expect(store.selectedReportId).toBe(3002)
    expect(store.detailStatus).toBe('error')
    expect(store.startDate).toBe('2026-07-03')
    expect(store.endDate).toBe('2026-07-24')
    expect(store.createError).toContain('생성됐지만')
  })

  it('중복 기간 오류의 existingReportId를 보관하고 기존 보고서를 연다', async () => {
    const duplicateError = new ApiError({
      status: 409,
      code: 'REPORT_PERIOD_ALREADY_EXISTS',
      message: '같은 기간의 보고서가 이미 있습니다.',
      responseBody: {
        error: {
          details: { existingReportId: 1002 },
        },
      },
    })
    const get = vi.fn().mockResolvedValue(reportFixtures[0])
    const store = useReportStore()
    store.setRepository(
      repository({
        listByStudent: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockRejectedValue(duplicateError),
        get,
      }),
    )
    await store.loadForStudent(1)
    store.startDate = '2026-07-01'
    store.endDate = '2026-07-27'

    await store.createReport(1)
    await store.openDuplicateReport()

    expect(store.duplicateReportId).toBe(1002)
    expect(get).toHaveBeenCalledWith(
      1002,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.selectedReport?.reportId).toBe(1002)
  })

  it('의견 저장 실패 시 입력과 보고서 생성일을 유지한다', async () => {
    const store = useReportStore()
    store.setRepository(
      repository({
        listByStudent: vi.fn().mockResolvedValue([reportFixtures[0]]),
        get: vi.fn().mockResolvedValue(reportFixtures[0]),
        updateTeacherMemo: vi.fn().mockRejectedValue(new Error('저장 실패')),
      }),
    )
    await store.loadForStudent(1)
    await store.selectReport(1002)
    const createdAt = store.selectedReport?.createdAt
    store.setTeacherMemoDraft('수정 중인 의견')

    await expect(store.saveTeacherMemo()).resolves.toBe(false)

    expect(store.teacherMemoDraft).toBe('수정 중인 의견')
    expect(store.selectedReport?.createdAt).toBe(createdAt)
    expect(store.memoStatus).toBe('error')
  })

  it('시선 갱신 실패 시 기존 snapshot을 유지한다', async () => {
    const detail = reportFixtures[0]!
    const store = useReportStore()
    store.setRepository(
      repository({
        listByStudent: vi.fn().mockResolvedValue([detail]),
        get: vi.fn().mockResolvedValue(detail),
        refreshGazeTrend: vi.fn().mockRejectedValue(new Error('갱신 실패')),
      }),
    )
    await store.loadForStudent(1)
    await store.selectReport(detail.reportId)
    const snapshot = store.selectedReport?.snapshot

    await expect(store.refreshGazeTrend()).resolves.toBe(false)

    expect(store.selectedReport?.snapshot).toBe(snapshot)
    expect(store.gazeRefreshStatus).toBe('error')
  })

  it('reset이 진행 요청과 보고서 선택 상태를 모두 비운다', async () => {
    const store = useReportStore()
    store.setRepository(new TestReportRepository({ delayMs: 0 }))
    await store.loadForStudent(1)
    await store.selectReport(1002)

    store.reset()

    expect(store.activeStudentId).toBeNull()
    expect(store.reports).toEqual([])
    expect(store.selectedReportId).toBeNull()
    expect(store.selectedReport).toBeNull()
    expect(store.listStatus).toBe('idle')
  })
})

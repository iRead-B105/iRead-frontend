import { ApiError } from '@/lib/api'
import { createMockDemoDate } from '@/features/teacher/demo'
import {
  completedLearningDatesByStudentFixture,
  createMockReportSnapshot,
  refreshedReportGazeTrendFixture,
  reportFixtures,
} from '../fixtures'
import type { CreateReportInput, ReportDetail, ReportListItem } from '../model'
import { localDateString, REPORT_MEMO_MAX_LENGTH, validateReportPeriod } from '../validation'
import type { ReportRepository, ReportRequestOptions } from './reportRepository'

export interface MockReportRepositoryOptions {
  readonly reports?: readonly ReportDetail[]
  readonly completedLearningDatesByStudent?: Readonly<Record<number, readonly string[]>>
  readonly now?: () => Date
  readonly delayMs?: number
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function assertPositiveId(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: `${field}는 양의 정수여야 합니다.`,
    })
  }
}

function wait(delayMs: number, options?: ReportRequestOptions): Promise<void> {
  if (options?.signal?.aborted) {
    return Promise.reject(new DOMException('요청이 취소되었습니다.', 'AbortError'))
  }
  if (delayMs <= 0) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(resolve, delayMs)
    options?.signal?.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timer)
        reject(new DOMException('요청이 취소되었습니다.', 'AbortError'))
      },
      { once: true },
    )
  })
}

function toListItem(report: ReportDetail): ReportListItem {
  return {
    reportId: report.reportId,
    studentId: report.studentId,
    startDate: report.startDate,
    endDate: report.endDate,
    createdAt: report.createdAt,
  }
}

export class MockReportRepository implements ReportRepository {
  private readonly reports = new Map<number, ReportDetail>()
  private readonly completedLearningDatesByStudent: Readonly<Record<number, readonly string[]>>
  private readonly now: () => Date
  private readonly delayMs: number
  private nextReportId: number

  constructor(options: MockReportRepositoryOptions = {}) {
    for (const report of options.reports ?? reportFixtures) {
      this.reports.set(report.reportId, clone(report))
    }
    this.completedLearningDatesByStudent =
      options.completedLearningDatesByStudent ?? completedLearningDatesByStudentFixture
    this.now = options.now ?? createMockDemoDate
    this.delayMs = options.delayMs ?? 80
    this.nextReportId = Math.max(0, ...Array.from(this.reports.keys())) + 1
  }

  async listByStudent(
    studentId: number,
    options: ReportRequestOptions = {},
  ): Promise<readonly ReportListItem[]> {
    assertPositiveId(studentId, 'studentId')
    await wait(this.delayMs, options)
    return Array.from(this.reports.values())
      .filter((report) => report.studentId === studentId)
      .sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) || right.reportId - left.reportId,
      )
      .map((report) => clone(toListItem(report)))
  }

  async create(input: CreateReportInput) {
    assertPositiveId(input.studentId, 'studentId')
    const periodErrors = validateReportPeriod(
      input.startDate,
      input.endDate,
      localDateString(this.now()),
    )
    if (periodErrors.startDate || periodErrors.endDate) {
      throw new ApiError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message:
          periodErrors.startDate ?? periodErrors.endDate ?? '보고서 기간이 올바르지 않습니다.',
      })
    }
    const duplicate = Array.from(this.reports.values()).find(
      (report) =>
        report.studentId === input.studentId &&
        report.startDate === input.startDate &&
        report.endDate === input.endDate,
    )
    if (duplicate) {
      throw new ApiError({
        status: 409,
        code: 'REPORT_PERIOD_ALREADY_EXISTS',
        message: '같은 기간의 보고서가 이미 있습니다.',
        responseBody: {
          error: {
            code: 'REPORT_PERIOD_ALREADY_EXISTS',
            message: '같은 기간의 보고서가 이미 있습니다.',
            details: { existingReportId: duplicate.reportId },
          },
        },
      })
    }

    const hasCompletedLearning = (this.completedLearningDatesByStudent[input.studentId] ?? []).some(
      (date) => date >= input.startDate && date <= input.endDate,
    )
    if (!hasCompletedLearning) {
      throw new ApiError({
        status: 400,
        code: 'REPORT_DATA_NOT_FOUND',
        message: '선택한 기간에 완료된 학습 기록이 없습니다.',
      })
    }

    await wait(this.delayMs)
    const reportId = this.nextReportId++
    const createdAt = this.now().toISOString()
    this.reports.set(reportId, {
      reportId,
      studentId: input.studentId,
      startDate: input.startDate,
      endDate: input.endDate,
      createdAt,
      snapshot: createMockReportSnapshot(input.startDate, input.endDate),
      teacherMemo: null,
    })
    return { reportId, createdAt }
  }

  async get(reportId: number, options: ReportRequestOptions = {}) {
    assertPositiveId(reportId, 'reportId')
    await wait(this.delayMs, options)
    const report = this.reports.get(reportId)
    if (!report) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '보고서를 찾을 수 없습니다.',
      })
    }
    return clone(report)
  }

  async updateTeacherMemo(reportId: number, teacherMemo: string | null) {
    assertPositiveId(reportId, 'reportId')
    const report = this.reports.get(reportId)
    if (!report) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '보고서를 찾을 수 없습니다.',
      })
    }
    const normalized = teacherMemo?.trim() || null
    if ((normalized?.length ?? 0) > REPORT_MEMO_MAX_LENGTH) {
      throw new ApiError({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: '교수자 의견은 2,000자 이하여야 합니다.',
      })
    }
    await wait(this.delayMs)
    this.reports.set(reportId, { ...report, teacherMemo: normalized })
    return {
      reportId,
      teacherMemo: normalized,
      createdAt: report.createdAt,
    }
  }

  async refreshGazeTrend(reportId: number) {
    assertPositiveId(reportId, 'reportId')
    const report = this.reports.get(reportId)
    if (!report) {
      throw new ApiError({
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        message: '보고서를 찾을 수 없습니다.',
      })
    }
    await wait(this.delayMs)
    const gazeTrend =
      report.reportId === 1002
        ? clone(refreshedReportGazeTrendFixture)
        : clone(report.snapshot.gazeTrend)
    this.reports.set(reportId, {
      ...report,
      snapshot: {
        ...report.snapshot,
        gazeTrend,
      },
    })
    return { reportId }
  }
}

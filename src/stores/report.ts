import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  localDateString,
  normalizeTeacherMemo,
  reportRepository,
  validateReportPeriod,
  validateTeacherMemo,
  type ReportCreateStatus,
  type ReportDetail,
  type ReportGazeRefreshStatus,
  type ReportListItem,
  type ReportMemoStatus,
  type ReportRepository,
  type ReportRequestStatus,
} from '@/features/teacher/report'
import { mapCommonError, type UiError } from '@/features/teacher/error'
import { isAbortError, isApiError } from '@/lib/api'

function errorMessage(error: unknown, fallback: string): string {
  if (!isApiError(error)) return fallback
  return (
    mapCommonError(error, {
      overrides: {
        REPORT_DATA_NOT_FOUND: {
          message: '선택한 기간에 완료된 학습 기록이 없습니다.',
          action: 'edit-input',
          retryable: false,
        },
        REPORT_PERIOD_ALREADY_EXISTS: {
          message: '같은 기간의 보고서가 이미 있습니다.',
          action: 'open-existing',
          retryable: false,
        },
      },
    })?.message ?? fallback
  )
}

function defaultPeriod(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 30)
  return {
    startDate: localDateString(start),
    endDate: localDateString(end),
  }
}

function existingReportId(error: unknown): number | null {
  if (!isApiError(error) || error.code !== 'REPORT_PERIOD_ALREADY_EXISTS') return null
  const body = error.responseBody
  if (typeof body !== 'object' || body === null || !('error' in body)) return null
  const errorBody = body.error
  if (typeof errorBody !== 'object' || errorBody === null || !('details' in errorBody)) {
    return null
  }
  const details = errorBody.details
  if (
    typeof details !== 'object' ||
    details === null ||
    !('existingReportId' in details) ||
    typeof details.existingReportId !== 'number'
  ) {
    return null
  }
  return details.existingReportId
}

export const useReportStore = defineStore('report', () => {
  const repository = ref<ReportRepository>(reportRepository)
  const initialPeriod = defaultPeriod()
  const activeStudentId = ref<number | null>(null)
  const reports = ref<readonly ReportListItem[]>([])
  const selectedReportId = ref<number | null>(null)
  const selectedReport = ref<ReportDetail | null>(null)
  const startDate = ref(initialPeriod.startDate)
  const endDate = ref(initialPeriod.endDate)
  const teacherMemoDraft = ref('')
  const listStatus = ref<ReportRequestStatus>('idle')
  const detailStatus = ref<ReportRequestStatus>('idle')
  const createStatus = ref<ReportCreateStatus>('idle')
  const memoStatus = ref<ReportMemoStatus>('idle')
  const gazeRefreshStatus = ref<ReportGazeRefreshStatus>('idle')
  const listError = ref<string | null>(null)
  const listUiError = ref<UiError | null>(null)
  const detailError = ref<string | null>(null)
  const detailUiError = ref<UiError | null>(null)
  const createError = ref<string | null>(null)
  const memoError = ref<string | null>(null)
  const gazeRefreshError = ref<string | null>(null)
  const duplicateReportId = ref<number | null>(null)

  let listSequence = 0
  let detailSequence = 0
  let createSequence = 0
  let listController: AbortController | null = null
  let detailController: AbortController | null = null

  const memoDirty = computed(
    () =>
      selectedReport.value !== null &&
      normalizeTeacherMemo(teacherMemoDraft.value) !== selectedReport.value.teacherMemo,
  )

  function setRepository(nextRepository: ReportRepository): void {
    repository.value = nextRepository
    reset()
  }

  function clearSelection(): void {
    detailController?.abort()
    detailSequence += 1
    selectedReportId.value = null
    selectedReport.value = null
    detailStatus.value = 'idle'
    detailError.value = null
    detailUiError.value = null
    memoStatus.value = 'idle'
    memoError.value = null
    gazeRefreshStatus.value = 'idle'
    gazeRefreshError.value = null
    teacherMemoDraft.value = ''
  }

  function startNewReport(): void {
    clearSelection()
    createStatus.value = 'idle'
    createError.value = null
    duplicateReportId.value = null
  }

  async function loadList(studentId: number): Promise<void> {
    const requestSequence = ++listSequence
    listController?.abort()
    const controller = new AbortController()
    listController = controller
    listStatus.value = 'loading'
    listError.value = null
    listUiError.value = null

    try {
      const result = await repository.value.listByStudent(studentId, {
        signal: controller.signal,
      })
      if (requestSequence !== listSequence || activeStudentId.value !== studentId) return
      reports.value = result
      listStatus.value = 'ready'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== listSequence) return
      listStatus.value = 'error'
      listUiError.value = mapCommonError(error)
      listError.value = errorMessage(error, '저장된 보고서를 불러오지 못했습니다.')
    } finally {
      if (requestSequence === listSequence) listController = null
    }
  }

  async function loadForStudent(studentId: number): Promise<void> {
    if (activeStudentId.value !== studentId) {
      listController?.abort()
      reports.value = []
      activeStudentId.value = studentId
      clearSelection()
      createStatus.value = 'idle'
      createError.value = null
      duplicateReportId.value = null
    }
    await loadList(studentId)
  }

  async function selectReport(reportId: number): Promise<boolean> {
    const requestSequence = ++detailSequence
    detailController?.abort()
    const controller = new AbortController()
    detailController = controller
    selectedReportId.value = reportId
    selectedReport.value = null
    detailStatus.value = 'loading'
    detailError.value = null
    detailUiError.value = null
    memoStatus.value = 'idle'
    memoError.value = null
    gazeRefreshStatus.value = 'idle'
    gazeRefreshError.value = null

    try {
      const detail = await repository.value.get(reportId, { signal: controller.signal })
      if (requestSequence !== detailSequence || selectedReportId.value !== reportId) {
        return false
      }
      if (activeStudentId.value !== null && detail.studentId !== activeStudentId.value) {
        throw new Error('선택한 학습자의 보고서가 아닙니다.')
      }
      selectedReport.value = detail
      teacherMemoDraft.value = detail.teacherMemo ?? ''
      detailStatus.value = 'ready'
      return true
    } catch (error) {
      if (isAbortError(error) || requestSequence !== detailSequence) return false
      detailStatus.value = 'error'
      detailUiError.value = mapCommonError(error)
      detailError.value = errorMessage(error, '보고서 상세를 불러오지 못했습니다.')
      return false
    } finally {
      if (requestSequence === detailSequence) detailController = null
    }
  }

  async function createReport(studentId: number): Promise<boolean> {
    if (createStatus.value === 'submitting') return false
    const periodErrors = validateReportPeriod(startDate.value, endDate.value)
    if (periodErrors.startDate || periodErrors.endDate) {
      createStatus.value = 'error'
      createError.value = periodErrors.startDate ?? periodErrors.endDate ?? null
      return false
    }

    const requestSequence = ++createSequence
    createStatus.value = 'submitting'
    createError.value = null
    duplicateReportId.value = null

    try {
      const result = await repository.value.create({
        studentId,
        startDate: startDate.value,
        endDate: endDate.value,
      })
      if (requestSequence !== createSequence || activeStudentId.value !== studentId) {
        return false
      }
      const detailLoaded = await selectReport(result.reportId)
      await loadList(studentId)
      createStatus.value = detailLoaded ? 'idle' : 'error'
      if (!detailLoaded) {
        createError.value =
          '보고서는 생성됐지만 상세 정보를 불러오지 못했습니다. 다시 시도해 주세요.'
      }
      return detailLoaded
    } catch (error) {
      if (requestSequence !== createSequence) return false
      createStatus.value = 'error'
      createError.value = errorMessage(error, '보고서를 생성하지 못했습니다.')
      duplicateReportId.value = existingReportId(error)
      return false
    }
  }

  async function openDuplicateReport(): Promise<boolean> {
    if (duplicateReportId.value === null) return false
    return selectReport(duplicateReportId.value)
  }

  function setTeacherMemoDraft(value: string): void {
    teacherMemoDraft.value = value
    if (memoStatus.value === 'saved') memoStatus.value = 'idle'
    memoError.value = null
  }

  function cancelTeacherMemo(): void {
    teacherMemoDraft.value = selectedReport.value?.teacherMemo ?? ''
    memoStatus.value = 'idle'
    memoError.value = null
  }

  async function saveTeacherMemo(): Promise<boolean> {
    const report = selectedReport.value
    if (!report || memoStatus.value === 'saving' || !memoDirty.value) return false
    const validationError = validateTeacherMemo(teacherMemoDraft.value)
    if (validationError) {
      memoStatus.value = 'error'
      memoError.value = validationError
      return false
    }

    memoStatus.value = 'saving'
    memoError.value = null
    try {
      const result = await repository.value.updateTeacherMemo(
        report.reportId,
        normalizeTeacherMemo(teacherMemoDraft.value),
      )
      if (selectedReportId.value !== report.reportId || !selectedReport.value) {
        return false
      }
      selectedReport.value = {
        ...selectedReport.value,
        teacherMemo: result.teacherMemo,
        createdAt: result.createdAt,
      }
      teacherMemoDraft.value = result.teacherMemo ?? ''
      memoStatus.value = 'saved'
      return true
    } catch (error) {
      memoStatus.value = 'error'
      memoError.value = errorMessage(error, '교수자 의견을 저장하지 못했습니다.')
      return false
    }
  }

  async function refreshGazeTrend(): Promise<boolean> {
    const report = selectedReport.value
    if (!report || gazeRefreshStatus.value === 'refreshing') return false
    gazeRefreshStatus.value = 'refreshing'
    gazeRefreshError.value = null
    try {
      await repository.value.refreshGazeTrend(report.reportId)
      const refreshed = await repository.value.get(report.reportId)
      if (selectedReportId.value !== report.reportId) return false
      selectedReport.value = refreshed
      teacherMemoDraft.value = refreshed.teacherMemo ?? ''
      gazeRefreshStatus.value = 'idle'
      return true
    } catch (error) {
      gazeRefreshStatus.value = 'error'
      gazeRefreshError.value = errorMessage(error, '시선 분석 결과를 갱신하지 못했습니다.')
      return false
    }
  }

  function reset(): void {
    listController?.abort()
    detailController?.abort()
    listSequence += 1
    detailSequence += 1
    createSequence += 1
    const period = defaultPeriod()
    activeStudentId.value = null
    reports.value = []
    selectedReportId.value = null
    selectedReport.value = null
    startDate.value = period.startDate
    endDate.value = period.endDate
    teacherMemoDraft.value = ''
    listStatus.value = 'idle'
    detailStatus.value = 'idle'
    createStatus.value = 'idle'
    memoStatus.value = 'idle'
    gazeRefreshStatus.value = 'idle'
    listError.value = null
    listUiError.value = null
    detailError.value = null
    detailUiError.value = null
    createError.value = null
    memoError.value = null
    gazeRefreshError.value = null
    duplicateReportId.value = null
    listController = null
    detailController = null
  }

  return {
    activeStudentId,
    reports,
    selectedReportId,
    selectedReport,
    startDate,
    endDate,
    teacherMemoDraft,
    listStatus,
    detailStatus,
    createStatus,
    memoStatus,
    gazeRefreshStatus,
    listError,
    listUiError,
    detailError,
    detailUiError,
    createError,
    memoError,
    gazeRefreshError,
    duplicateReportId,
    memoDirty,
    setRepository,
    loadList,
    loadForStudent,
    selectReport,
    createReport,
    openDuplicateReport,
    setTeacherMemoDraft,
    cancelTeacherMemo,
    saveTeacherMemo,
    refreshGazeTrend,
    clearSelection,
    startNewReport,
    reset,
  }
})

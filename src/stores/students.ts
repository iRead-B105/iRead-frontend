import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  DEFAULT_STUDENT_PAGE_SIZE,
  studentRepository,
  toStudentNavigationItem,
  type StudentCreateInput,
  type StudentDetail,
  type StudentListItem,
  type StudentMutationCommand,
  type StudentNavigationItem,
  type StudentRepository,
  type StudentRequestStatus,
  type StudentSummary,
  type StudentUpdateInput,
} from '@/features/teacher/student'

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '학습자 정보를 불러오지 못했습니다.'
}

export const useStudentStore = defineStore('students', () => {
  const repository = ref<StudentRepository>(studentRepository)
  const query = reactive<{
    keyword?: string
    age?: number
    recentDays?: 7 | 30
    page: number
    size: number
  }>({
    keyword: undefined,
    age: undefined,
    recentDays: undefined,
    page: 0,
    size: DEFAULT_STUDENT_PAGE_SIZE,
  })
  const students = ref<readonly StudentListItem[]>([])
  const totalElements = ref(0)
  const totalPages = ref(0)
  const listStatus = ref<StudentRequestStatus>('idle')
  const listError = ref<string | null>(null)
  const listStale = ref(true)
  const summary = ref<StudentSummary | null>(null)
  const summaryStatus = ref<StudentRequestStatus>('idle')
  const summaryError = ref<string | null>(null)
  const summaryStale = ref(true)
  const detailsById = ref<Record<number, StudentDetail>>({})
  const detailStatus = ref<StudentRequestStatus>('idle')
  const detailError = ref<string | null>(null)
  const detailStaleById = ref<Record<number, boolean>>({})

  const navigationQuery = reactive({
    keyword: '',
    page: 0,
    size: DEFAULT_STUDENT_PAGE_SIZE,
  })
  const navigationItemsById = ref<Record<number, StudentNavigationItem>>({})
  const navigationOrder = ref<number[]>([])
  const navigationHasNextPage = ref(false)
  const navigationStatus = ref<StudentRequestStatus>('idle')
  const navigationError = ref<string | null>(null)
  const recentStudentIds = ref<number[]>([])
  const selectedStudentId = ref<number | null>(null)

  let listSequence = 0
  let navigationSequence = 0
  let listController: AbortController | null = null
  let navigationController: AbortController | null = null
  let summaryController: AbortController | null = null

  const navigationItems = computed(() =>
    navigationOrder.value
      .map((studentId) => navigationItemsById.value[studentId])
      .filter((student): student is StudentNavigationItem => Boolean(student)),
  )
  const recentStudents = computed(() =>
    recentStudentIds.value
      .map((studentId) => navigationItemsById.value[studentId])
      .filter((student): student is StudentNavigationItem => Boolean(student)),
  )
  const hasActiveFilters = computed(
    () =>
      Boolean(query.keyword?.trim()) ||
      query.age !== undefined ||
      query.recentDays !== undefined,
  )

  function setRepository(nextRepository: StudentRepository): void {
    repository.value = nextRepository
    reset()
  }

  function setListFilters(filters: {
    keyword?: string
    age?: number
    recentDays?: 7 | 30
  }): void {
    query.keyword = filters.keyword?.trim() || undefined
    query.age = filters.age
    query.recentDays = filters.recentDays
    query.page = 0
  }

  function setListPage(page: number): void {
    query.page = page
  }

  function clearListFilters(): void {
    query.keyword = undefined
    query.age = undefined
    query.recentDays = undefined
    query.page = 0
  }

  async function loadList(): Promise<void> {
    const requestSequence = ++listSequence
    listController?.abort()
    const controller = new AbortController()
    listController = controller
    listStatus.value = 'loading'
    listError.value = null

    try {
      const result = await repository.value.list({ ...query }, { signal: controller.signal })
      if (requestSequence !== listSequence) return

      if (result.totalPages > 0 && query.page >= result.totalPages) {
        query.page = result.totalPages - 1
        await loadList()
        return
      }

      students.value = result.students
      query.page = result.page
      query.size = result.size
      totalElements.value = result.totalElements
      totalPages.value = result.totalPages
      listStatus.value = 'success'
      listStale.value = false
    } catch (error) {
      if (isAbortError(error) || requestSequence !== listSequence) return
      listStatus.value = 'error'
      listError.value = errorMessage(error)
    } finally {
      if (requestSequence === listSequence) listController = null
    }
  }

  async function loadSummary(): Promise<void> {
    summaryController?.abort()
    const controller = new AbortController()
    summaryController = controller
    summaryStatus.value = 'loading'
    summaryError.value = null

    try {
      summary.value = await repository.value.getSummary({ signal: controller.signal })
      summaryStatus.value = 'success'
      summaryStale.value = false
    } catch (error) {
      if (isAbortError(error)) return
      summaryStatus.value = 'error'
      summaryError.value = errorMessage(error)
    } finally {
      if (summaryController === controller) summaryController = null
    }
  }

  function mergeNavigationItems(items: readonly StudentListItem[], resetItems: boolean): void {
    const preservedIds = new Set([
      ...recentStudentIds.value,
      ...(selectedStudentId.value === null ? [] : [selectedStudentId.value]),
    ])
    const nextById = resetItems
      ? Object.fromEntries(
          Object.entries(navigationItemsById.value).filter(([studentId]) =>
            preservedIds.has(Number(studentId)),
          ),
        )
      : { ...navigationItemsById.value }
    const nextOrder = resetItems ? [] : [...navigationOrder.value]

    for (const student of items) {
      nextById[student.studentId] = toStudentNavigationItem(student)
      if (!nextOrder.includes(student.studentId)) nextOrder.push(student.studentId)
    }

    navigationItemsById.value = nextById
    navigationOrder.value = nextOrder
    if (selectedStudentId.value === null && items[0]) {
      selectedStudentId.value = items[0].studentId
    }
  }

  async function loadNavigation(options: { reset?: boolean } = {}): Promise<void> {
    const resetItems = options.reset ?? false
    if (resetItems) navigationQuery.page = 0

    const requestSequence = ++navigationSequence
    navigationController?.abort()
    const controller = new AbortController()
    navigationController = controller
    navigationStatus.value = 'loading'
    navigationError.value = null

    try {
      const result = await repository.value.list(
        {
          keyword: navigationQuery.keyword,
          page: navigationQuery.page,
          size: navigationQuery.size,
        },
        { signal: controller.signal },
      )
      if (requestSequence !== navigationSequence) return

      mergeNavigationItems(result.students, resetItems)
      navigationQuery.page = result.page
      navigationHasNextPage.value = result.page + 1 < result.totalPages
      navigationStatus.value = 'success'
    } catch (error) {
      if (isAbortError(error) || requestSequence !== navigationSequence) return
      navigationStatus.value = 'error'
      navigationError.value = errorMessage(error)
    } finally {
      if (requestSequence === navigationSequence) navigationController = null
    }
  }

  async function searchNavigation(keyword: string): Promise<void> {
    navigationQuery.keyword = keyword.trim()
    await loadNavigation({ reset: true })
  }

  async function loadMoreNavigation(): Promise<void> {
    if (!navigationHasNextPage.value || navigationStatus.value === 'loading') return
    navigationQuery.page += 1
    await loadNavigation()
  }

  function rememberStudent(student: StudentNavigationItem): void {
    navigationItemsById.value = {
      ...navigationItemsById.value,
      [student.studentId]: student,
    }
    recentStudentIds.value = [
      student.studentId,
      ...recentStudentIds.value.filter((studentId) => studentId !== student.studentId),
    ].slice(0, 5)
    selectedStudentId.value = student.studentId
  }

  async function loadDetail(studentId: number): Promise<StudentDetail | null> {
    detailStatus.value = 'loading'
    detailError.value = null

    try {
      const detail = await repository.value.getDetail(studentId)
      detailsById.value = {
        ...detailsById.value,
        [studentId]: detail,
      }
      detailStaleById.value = {
        ...detailStaleById.value,
        [studentId]: false,
      }
      rememberStudent({
        studentId: detail.studentId,
        name: detail.name,
        school: detail.school,
        imageUrl: detail.imageUrl,
      })
      detailStatus.value = 'success'
      return detail
    } catch (error) {
      detailStatus.value = 'error'
      detailError.value = errorMessage(error)
      return null
    }
  }

  function markListAndSummaryStale(): void {
    listStale.value = true
    summaryStale.value = true
  }

  async function createStudent(
    command: StudentMutationCommand<StudentCreateInput>,
  ): Promise<number> {
    const studentId = await repository.value.create(command)
    markListAndSummaryStale()
    return studentId
  }

  async function updateStudent(
    studentId: number,
    command: StudentMutationCommand<StudentUpdateInput>,
  ): Promise<StudentDetail> {
    await repository.value.update(studentId, command)
    listStale.value = true
    detailStaleById.value = {
      ...detailStaleById.value,
      [studentId]: true,
    }

    const detail = await repository.value.getDetail(studentId)
    detailsById.value = {
      ...detailsById.value,
      [studentId]: detail,
    }
    detailStaleById.value = {
      ...detailStaleById.value,
      [studentId]: false,
    }
    rememberStudent({
      studentId: detail.studentId,
      name: detail.name,
      school: detail.school,
      imageUrl: detail.imageUrl,
    })
    return detail
  }

  async function deleteStudent(studentId: number): Promise<void> {
    await repository.value.remove(studentId)
    const nextDetails = { ...detailsById.value }
    const nextDetailStale = { ...detailStaleById.value }
    const nextNavigationItems = { ...navigationItemsById.value }
    delete nextDetails[studentId]
    delete nextDetailStale[studentId]
    delete nextNavigationItems[studentId]
    detailsById.value = nextDetails
    detailStaleById.value = nextDetailStale
    navigationItemsById.value = nextNavigationItems
    navigationOrder.value = navigationOrder.value.filter((id) => id !== studentId)
    recentStudentIds.value = recentStudentIds.value.filter((id) => id !== studentId)
    if (selectedStudentId.value === studentId) selectedStudentId.value = null
    markListAndSummaryStale()
  }

  function reset(): void {
    listController?.abort()
    navigationController?.abort()
    summaryController?.abort()
    listSequence += 1
    navigationSequence += 1

    query.keyword = undefined
    query.age = undefined
    query.recentDays = undefined
    query.page = 0
    query.size = DEFAULT_STUDENT_PAGE_SIZE
    students.value = []
    totalElements.value = 0
    totalPages.value = 0
    listStatus.value = 'idle'
    listError.value = null
    listStale.value = true
    summary.value = null
    summaryStatus.value = 'idle'
    summaryError.value = null
    summaryStale.value = true
    detailsById.value = {}
    detailStatus.value = 'idle'
    detailError.value = null
    detailStaleById.value = {}

    navigationQuery.keyword = ''
    navigationQuery.page = 0
    navigationQuery.size = DEFAULT_STUDENT_PAGE_SIZE
    navigationItemsById.value = {}
    navigationOrder.value = []
    navigationHasNextPage.value = false
    navigationStatus.value = 'idle'
    navigationError.value = null
    recentStudentIds.value = []
    selectedStudentId.value = null
  }

  return {
    query,
    students,
    totalElements,
    totalPages,
    listStatus,
    listError,
    listStale,
    summary,
    summaryStatus,
    summaryError,
    summaryStale,
    detailsById,
    detailStatus,
    detailError,
    detailStaleById,
    navigationQuery,
    navigationItemsById,
    navigationItems,
    navigationHasNextPage,
    navigationStatus,
    navigationError,
    recentStudentIds,
    selectedStudentId,
    recentStudents,
    hasActiveFilters,
    setRepository,
    setListFilters,
    setListPage,
    clearListFilters,
    loadList,
    loadSummary,
    loadNavigation,
    searchNavigation,
    loadMoreNavigation,
    rememberStudent,
    loadDetail,
    createStudent,
    updateStudent,
    deleteStudent,
    reset,
  }
})

import type { Pinia } from 'pinia'
import { watch, type WatchStopHandle } from 'vue'
import type { Router } from 'vue-router'
import { appEnvironment } from '@/config/runtimeEnv'
import { RealtimeClient, type RealtimeEvent } from '@/lib/realtime/realtimeClient'
import { useRealtimeFreshnessStore, type RealtimeFreshnessScope } from '@/stores/realtimeFreshness'
import { useSessionStore } from '@/stores/session'
import { useStoryHistoryStore } from '@/stores/storyHistory'
import { useStudentStore } from '@/stores/students'
import { useTestStore } from '@/stores/test'
import { useTrainingStore } from '@/stores/training'

const SAFETY_REFRESH_MILLIS = 3_000
const GLOBAL_ONLY_ROUTES = new Set(['teacher-students'])
const STUDENT_DATA_ROUTES = new Set([
  'student-overview',
  'student-edit',
  'student-curriculum',
  'student-training-history',
  'student-test-history',
  'student-story-history',
])

interface FreshnessContext {
  readonly key: string
  readonly scopes: readonly RealtimeFreshnessScope[]
}

function routeStudentId(router: Router): number | null {
  const value = Number(router.currentRoute.value.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
}

function freshnessContext(router: Router, authenticated: boolean): FreshnessContext | null {
  if (!authenticated) return null
  const routeName = String(router.currentRoute.value.name)
  if (GLOBAL_ONLY_ROUTES.has(routeName)) {
    return { key: routeName, scopes: ['global'] }
  }
  const studentId = routeStudentId(router)
  if (studentId !== null && STUDENT_DATA_ROUTES.has(routeName)) {
    return { key: `${routeName}:${studentId}`, scopes: ['global', 'visible'] }
  }
  return null
}

function hasResolvedWithoutError(...statuses: readonly string[]): boolean {
  return statuses.every((status) => status === 'idle' || status === 'success')
}

export function installTeacherRealtimeSync(pinia: Pinia, router: Router): () => void {
  if (appEnvironment.dataSource !== 'api') return () => undefined

  const session = useSessionStore(pinia)
  const freshness = useRealtimeFreshnessStore(pinia)
  const students = useStudentStore(pinia)
  const training = useTrainingStore(pinia)
  const tests = useTestStore(pinia)
  const stories = useStoryHistoryStore(pinia)
  let client: RealtimeClient | null = null
  let refreshPromise: Promise<boolean> | null = null
  let refreshPromiseKey: string | null = null
  let globalRefreshPromise: Promise<boolean> | null = null
  const lastVersionByStudent = new Map<number, number>()

  const syncFreshnessContext = (): FreshnessContext | null => {
    const context = freshnessContext(router, session.authenticated)
    freshness.setContext(context?.key ?? null, context?.scopes ?? [])
    return context
  }

  const refreshGlobalStudents = (): Promise<boolean> => {
    if (!session.authenticated || document.visibilityState !== 'visible') {
      return Promise.resolve(true)
    }
    if (globalRefreshPromise) return globalRefreshPromise
    const task = Promise.allSettled([students.loadList(), students.loadSummary()])
      .then(() => students.listStatus === 'success' && students.summaryStatus === 'success')
      .finally(() => {
        if (globalRefreshPromise === task) globalRefreshPromise = null
      })
    globalRefreshPromise = task
    return task
  }

  const refreshVisibleStudent = (requestedStudentId?: number): Promise<boolean> => {
    const studentId = requestedStudentId ?? routeStudentId(router)
    if (!session.authenticated || studentId === null || document.visibilityState !== 'visible') {
      return Promise.resolve(true)
    }
    const routeName = String(router.currentRoute.value.name)
    const requestKey = `${routeName}:${studentId}`
    if (refreshPromise && refreshPromiseKey === requestKey) return refreshPromise

    let request: Promise<unknown>
    let succeeded: () => boolean
    switch (routeName) {
      case 'student-curriculum':
        request = training.loadForStudent(studentId)
        succeeded = () =>
          training.catalogStatus === 'success' && training.curriculumStatus === 'success'
        break
      case 'student-training-history':
        request = training.loadHistoryForStudent(studentId)
        succeeded = () =>
          training.curriculumLogsStatus === 'success' &&
          hasResolvedWithoutError(
            training.trainingLogStatus,
            training.statisticsStatus,
            training.historyDetailStatus,
            training.historyGazeStatus,
          )
        break
      case 'student-test-history':
        request = tests.loadForStudent(studentId)
        succeeded = () =>
          tests.listStatus === 'success' &&
          hasResolvedWithoutError(tests.comparisonStatus, tests.trendStatus, tests.gazeStatus)
        break
      case 'student-story-history':
        request = stories.loadList(studentId).then(() => {
          const storyId = stories.selectedStoryId
          return storyId === null
            ? Promise.resolve()
            : stories.loadSelectedStory(studentId, storyId)
        })
        succeeded = () =>
          stories.listStatus === 'success' &&
          hasResolvedWithoutError(stories.detailStatus, stories.gazeStatus)
        break
      case 'student-report':
        return Promise.resolve(true)
      default:
        request = Promise.all([
          students.loadDetail(studentId),
          students.loadLearningSummary(studentId),
          students.loadLearningEvents(studentId),
        ])
        succeeded = () =>
          students.detailStatusById[studentId] === 'success' &&
          students.learningSummaryStatusById[studentId] === 'success' &&
          students.learningEventsStatusById[studentId] === 'success'
        break
    }

    const task = Promise.resolve(request)
      .then(succeeded, () => false)
      .finally(() => {
        if (refreshPromise === task) {
          refreshPromise = null
          refreshPromiseKey = null
        }
      })
    refreshPromise = task
    refreshPromiseKey = requestKey
    return task
  }

  const refreshCurrentContext = async ({
    requestedStudentId,
    includeGlobal = true,
    includeVisible = true,
  }: {
    requestedStudentId?: number
    includeGlobal?: boolean
    includeVisible?: boolean
  } = {}): Promise<void> => {
    if (!session.authenticated || document.visibilityState !== 'visible') return
    const context = syncFreshnessContext()
    const contextKey = context?.key ?? null
    const globalGeneration =
      includeGlobal && contextKey !== null ? freshness.beginRefresh('global', contextKey) : null
    const visibleGeneration =
      includeVisible && contextKey !== null ? freshness.beginRefresh('visible', contextKey) : null

    const [globalSucceeded, visibleSucceeded] = await Promise.all([
      includeGlobal ? refreshGlobalStudents() : Promise.resolve(true),
      includeVisible ? refreshVisibleStudent(requestedStudentId) : Promise.resolve(true),
    ])

    if (contextKey === null) return
    if (includeGlobal) {
      if (globalSucceeded) {
        freshness.markRefreshSuccess('global', contextKey, globalGeneration)
      } else {
        freshness.markRefreshFailure('global', contextKey, globalGeneration)
      }
    }
    if (includeVisible) {
      if (visibleSucceeded) {
        freshness.markRefreshSuccess('visible', contextKey, visibleGeneration)
      } else {
        freshness.markRefreshFailure('visible', contextKey, visibleGeneration)
      }
    }
  }

  const refreshLessonMaterialContent = async (
    studentId: number,
    trainingId: number,
  ): Promise<void> => {
    if (!session.authenticated || document.visibilityState !== 'visible') return
    const context = syncFreshnessContext()
    const contextKey = context?.key ?? null
    const globalGeneration =
      contextKey !== null ? freshness.beginRefresh('global', contextKey) : null
    const visibleGeneration =
      contextKey !== null ? freshness.beginRefresh('visible', contextKey) : null
    const [globalSucceeded, visibleSucceeded] = await Promise.all([
      refreshGlobalStudents(),
      training.handleLessonMaterialContentUpdated(studentId, trainingId),
    ])
    if (contextKey === null) return
    if (globalSucceeded) {
      freshness.markRefreshSuccess('global', contextKey, globalGeneration)
    } else {
      freshness.markRefreshFailure('global', contextKey, globalGeneration)
    }
    if (visibleSucceeded) {
      freshness.markRefreshSuccess('visible', contextKey, visibleGeneration)
    } else {
      freshness.markRefreshFailure('visible', contextKey, visibleGeneration)
    }
  }

  const handleEvent = async (event: RealtimeEvent): Promise<void> => {
    const previousVersion = lastVersionByStudent.get(event.studentId) ?? 0
    if (event.version <= previousVersion) return
    lastVersionByStudent.set(event.studentId, event.version)

    if (
      event.resource === 'TRAINING' &&
      event.changeType === 'CONTENT_UPDATED' &&
      event.resourceId !== null &&
      String(router.currentRoute.value.name) === 'student-curriculum' &&
      routeStudentId(router) === event.studentId
    ) {
      await refreshLessonMaterialContent(event.studentId, event.resourceId)
      return
    }

    await refreshCurrentContext({
      requestedStudentId: event.studentId,
      includeVisible: routeStudentId(router) === event.studentId,
    })
  }

  const stopSessionWatch: WatchStopHandle = watch(
    () => (session.authenticated ? session.accessToken : null),
    (accessToken) => {
      client?.stop()
      client = null
      lastVersionByStudent.clear()
      if (!accessToken) {
        freshness.reset()
        return
      }
      syncFreshnessContext()
      client = new RealtimeClient({
        endpoint: '/api/admin/realtime/events',
        onEvent: handleEvent,
        onStateChange: (state) => {
          if (state === 'connected') void refreshCurrentContext()
        },
      })
      client.start()
    },
    { immediate: true },
  )

  const stopContextWatch: WatchStopHandle = watch(
    () =>
      [
        session.authenticated,
        session.teacher?.email ?? '',
        String(router.currentRoute.value.name),
        String(router.currentRoute.value.params.id ?? ''),
      ] as const,
    () => {
      syncFreshnessContext()
    },
    { immediate: true, flush: 'sync' },
  )

  const stopRetryWatch: WatchStopHandle = watch(
    () => freshness.retryRequestVersion,
    (version) => {
      if (version === 0) return
      void refreshCurrentContext().finally(() => {
        freshness.finishRetry(version)
      })
    },
  )

  const safetyInterval = window.setInterval(() => {
    const routeName = String(router.currentRoute.value.name)
    void refreshCurrentContext({
      includeVisible: !['student-curriculum', 'student-report'].includes(routeName),
    })
  }, SAFETY_REFRESH_MILLIS)

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') void refreshCurrentContext()
  }
  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    stopSessionWatch()
    stopContextWatch()
    stopRetryWatch()
    client?.stop()
    freshness.reset()
    window.clearInterval(safetyInterval)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}

import type { Pinia } from 'pinia'
import { watch, type WatchStopHandle } from 'vue'
import type { Router } from 'vue-router'
import { appEnvironment } from '@/config/runtimeEnv'
import { RealtimeClient, type RealtimeEvent } from '@/lib/realtime/realtimeClient'
import { useSessionStore } from '@/stores/session'
import { useStoryHistoryStore } from '@/stores/storyHistory'
import { useStudentStore } from '@/stores/students'
import { useTestStore } from '@/stores/test'
import { useTrainingStore } from '@/stores/training'

const SAFETY_REFRESH_MILLIS = 3_000

function routeStudentId(router: Router): number | null {
  const value = Number(router.currentRoute.value.params.id)
  return Number.isInteger(value) && value > 0 ? value : null
}

export function installTeacherRealtimeSync(
  pinia: Pinia,
  router: Router,
): () => void {
  if (appEnvironment.dataSource !== 'api') return () => undefined

  const session = useSessionStore(pinia)
  const students = useStudentStore(pinia)
  const training = useTrainingStore(pinia)
  const tests = useTestStore(pinia)
  const stories = useStoryHistoryStore(pinia)
  let client: RealtimeClient | null = null
  let sseConnected = false
  let refreshPromise: Promise<void> | null = null
  let globalRefreshPromise: Promise<void> | null = null
  const lastVersionByStudent = new Map<number, number>()

  const refreshGlobalStudents = (): Promise<void> => {
    if (!session.authenticated || document.visibilityState !== 'visible') {
      return Promise.resolve()
    }
    if (globalRefreshPromise) return globalRefreshPromise
    const task = Promise.allSettled([
      students.loadList(),
      students.loadSummary(),
    ])
      .then(() => undefined)
      .finally(() => {
        if (globalRefreshPromise === task) globalRefreshPromise = null
      })
    globalRefreshPromise = task
    return task
  }

  const refreshVisibleStudent = (requestedStudentId?: number): Promise<void> => {
    const studentId = requestedStudentId ?? routeStudentId(router)
    if (
      !session.authenticated
      || studentId === null
      || document.visibilityState !== 'visible'
    ) {
      return Promise.resolve()
    }
    if (refreshPromise) return refreshPromise

    const routeName = String(router.currentRoute.value.name)
    let requests: Promise<unknown>[]
    switch (routeName) {
      case 'student-curriculum':
        requests = [training.loadForStudent(studentId)]
        break
      case 'student-training-history':
        requests = [training.loadHistoryForStudent(studentId)]
        break
      case 'student-test-history':
        requests = [tests.loadForStudent(studentId)]
        break
      case 'student-story-history':
        requests = [
          stories.loadList(studentId).then(() => {
            const storyId = stories.selectedStoryId
            return storyId === null
              ? Promise.resolve()
              : stories.loadSelectedStory(studentId, storyId)
          }),
        ]
        break
      case 'student-report':
        return Promise.resolve()
      default:
        requests = [
          students.loadDetail(studentId),
          students.loadLearningSummary(studentId),
          students.loadLearningEvents(studentId),
        ]
    }

    const task = Promise.allSettled(requests)
      .then(() => undefined)
      .finally(() => {
        if (refreshPromise === task) refreshPromise = null
      })
    refreshPromise = task
    return task
  }

  const handleEvent = async (event: RealtimeEvent): Promise<void> => {
    const previousVersion = lastVersionByStudent.get(event.studentId) ?? 0
    if (event.version <= previousVersion) return
    lastVersionByStudent.set(event.studentId, event.version)

    void refreshGlobalStudents()
    if (routeStudentId(router) === event.studentId) {
      await refreshVisibleStudent(event.studentId)
    }
  }

  const stopWatch: WatchStopHandle = watch(
    () => (session.authenticated ? session.accessToken : null),
    (accessToken) => {
      client?.stop()
      client = null
      lastVersionByStudent.clear()
      if (!accessToken) return
      client = new RealtimeClient({
        endpoint: '/api/admin/realtime/events',
        onEvent: handleEvent,
        onStateChange: (state) => {
          sseConnected = state === 'connected'
          if (sseConnected) {
            void refreshGlobalStudents()
            void refreshVisibleStudent()
          }
        },
      })
      client.start()
    },
    { immediate: true },
  )

  const safetyInterval = window.setInterval(() => {
    // SSE가 정상이면 실시간 이벤트로 갱신되므로 폴백 폴링을 건너뛴다(3초마다 refetch해 화면이 깜빡거리는 현상 방지).
    if (sseConnected) return
    void refreshGlobalStudents()
    const routeName = String(router.currentRoute.value.name)
    if (!['student-curriculum', 'student-report'].includes(routeName)) {
      void refreshVisibleStudent()
    }
  }, SAFETY_REFRESH_MILLIS)

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void refreshGlobalStudents()
      void refreshVisibleStudent()
    }
  }
  document.addEventListener('visibilitychange', handleVisibility)

  return () => {
    stopWatch()
    client?.stop()
    window.clearInterval(safetyInterval)
    document.removeEventListener('visibilitychange', handleVisibility)
  }
}

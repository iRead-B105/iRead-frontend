import type { Pinia } from 'pinia'
import { watch, type WatchStopHandle } from 'vue'
import { useReportStore } from './report'
import { useSessionStore } from './session'
import { useStoryHistoryStore } from './storyHistory'
import { useStudentStore } from './students'
import { useTestStore } from './test'
import { useTrainingStore } from './training'

export function installSessionScopedStoreReset(pinia: Pinia): WatchStopHandle {
  const sessionStore = useSessionStore(pinia)
  const studentStore = useStudentStore(pinia)
  const storyHistoryStore = useStoryHistoryStore(pinia)
  const reportStore = useReportStore(pinia)
  const testStore = useTestStore(pinia)
  const trainingStore = useTrainingStore(pinia)

  return watch(
    () => (sessionStore.status === 'authenticated' ? (sessionStore.teacher?.email ?? null) : null),
    (nextTeacherEmail, previousTeacherEmail) => {
      if (previousTeacherEmail === null || nextTeacherEmail === previousTeacherEmail) return

      studentStore.reset()
      storyHistoryStore.reset()
      reportStore.reset()
      testStore.reset()
      trainingStore.reset()
    },
    { flush: 'sync' },
  )
}

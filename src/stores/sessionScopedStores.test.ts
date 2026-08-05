import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import type { TeacherProfile } from '@/features/teacher/auth'
import { useReportStore } from './report'
import { useRealtimeFreshnessStore } from './realtimeFreshness'
import { useSessionStore } from './session'
import { useStoryHistoryStore } from './storyHistory'
import { installSessionScopedStoreReset } from './sessionScopedStores'
import { useStudentStore } from './students'
import { useTestStore } from './test'
import { useTrainingStore } from './training'

const firstTeacher: TeacherProfile = {
  email: 'first@example.com',
  name: '첫 번째 교수자',
  organization: null,
  gender: null,
  profileImageUrl: null,
}

const secondTeacher: TeacherProfile = {
  ...firstTeacher,
  email: 'second@example.com',
  name: '두 번째 교수자',
}

function setup() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const session = useSessionStore(pinia)
  const stores = [
    useStudentStore(pinia),
    useStoryHistoryStore(pinia),
    useReportStore(pinia),
    useRealtimeFreshnessStore(pinia),
    useTestStore(pinia),
    useTrainingStore(pinia),
  ] as const
  const resetSpies = stores.map((store) => vi.spyOn(store, 'reset'))
  const stop = installSessionScopedStoreReset(pinia)

  return { session, resetSpies, stop }
}

describe('session scoped stores', () => {
  it('로그아웃과 refresh 실패로 세션이 종료되면 관련 Store를 한 번씩 초기화한다', () => {
    const { session, resetSpies, stop } = setup()
    session.initialize(firstTeacher, 'access-token')

    session.reset()

    resetSpies.forEach((reset) => expect(reset).toHaveBeenCalledOnce())
    stop()
  })

  it('인증된 교수자가 바뀌면 이전 교수자의 Store 상태를 초기화한다', () => {
    const { session, resetSpies, stop } = setup()
    session.initialize(firstTeacher, 'first-token')

    session.initialize(secondTeacher, 'second-token')

    resetSpies.forEach((reset) => expect(reset).toHaveBeenCalledOnce())
    stop()
  })

  it('같은 교수자의 profile 변경과 첫 로그인에서는 Store를 초기화하지 않는다', () => {
    const { session, resetSpies, stop } = setup()
    session.initialize(firstTeacher, 'access-token')
    session.replaceTeacherProfile({
      ...firstTeacher,
      name: '변경된 이름',
    })

    resetSpies.forEach((reset) => expect(reset).not.toHaveBeenCalled())
    stop()
  })
})

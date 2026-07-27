import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSessionStore } from './session'

describe('session store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('인증되지 않은 초기 상태로 시작한다', () => {
    const session = useSessionStore()

    expect(session.authenticated).toBe(false)
    expect(session.teacher).toBeNull()
  })

  it('교수자 세션을 초기화하고 다시 비운다', () => {
    const session = useSessionStore()
    const teacher = {
      name: '이OO 선생님',
      email: 'teacher@example.com',
      organization: 'iRead 학습센터',
      gender: 'FEMALE' as const,
      profileImageUrl: '/images/teacher-profile.png',
    }

    session.initialize(teacher)

    expect(session.authenticated).toBe(true)
    expect(session.teacher).toEqual(teacher)

    session.reset()

    expect(session.authenticated).toBe(false)
    expect(session.teacher).toBeNull()
  })
})

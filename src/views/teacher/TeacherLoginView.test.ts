import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import TeacherLoginView from './TeacherLoginView.vue'
import { useSessionStore } from '@/stores/session'

async function mountLoginView(initialPath = '/login') {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'teacher-login', component: TeacherLoginView },
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>아동 목록</div>' },
        meta: { requiresAuth: true },
      },
      {
        path: '/signup',
        name: 'teacher-signup',
        component: { template: '<div />' },
      },
      {
        path: '/reset-password',
        name: 'teacher-reset-password',
        component: { template: '<div />' },
      },
    ],
  })

  await router.push(initialPath)
  await router.isReady()

  return {
    pinia,
    router,
    wrapper: mount(TeacherLoginView, {
      global: {
        plugins: [pinia, router],
      },
    }),
  }
}

describe('TeacherLoginView mock authentication', () => {
  it('Backend 미연동 안내와 명시적인 목업 진입 버튼을 표시한다', async () => {
    const { wrapper } = await mountLoginView()
    await vi.dynamicImportSettled()
    await flushPromises()

    expect(wrapper.text()).toContain('Backend와 연동 전 입니다.')
    expect(wrapper.text()).toContain('목업 화면으로 입장')
    expect(wrapper.text()).not.toContain('교수 데이터 삽입')
    expect(wrapper.text()).not.toContain('로그인 이메일 확인')
    expect(wrapper.find<HTMLInputElement>('#login-email').element.value).toBe('')
    expect(wrapper.find<HTMLInputElement>('#login-password').element.value).toBe('')
  })

  it('목업 진입 시 token 없이 교수자 세션을 만들고 아동 목록으로 이동한다', async () => {
    const { pinia, router, wrapper } = await mountLoginView()
    const session = useSessionStore(pinia)
    await vi.dynamicImportSettled()
    await flushPromises()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '목업 화면으로 입장')
      ?.trigger('click')
    await flushPromises()

    expect(session.authenticated).toBe(true)
    expect(session.accessToken).toBeNull()
    expect(session.teacher?.email).toBe('teacher@example.com')
    expect(router.currentRoute.value.name).toBe('teacher-students')
  })

  it('비밀번호 재설정 성공 안내를 표시하고 URL query에서는 제거한다', async () => {
    const { router, wrapper } = await mountLoginView('/login?passwordReset=success')
    await flushPromises()

    expect(wrapper.text()).toContain(
      '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해 주세요.',
    )
    expect(router.currentRoute.value.query.passwordReset).toBeUndefined()
  })
})

import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import TeacherLoginView from './TeacherLoginView.vue'

async function mountLoginView(initialPath = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'teacher-login', component: TeacherLoginView },
      { path: '/signup', name: 'teacher-signup', component: { template: '<div />' } },
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
    router,
    wrapper: mount(TeacherLoginView, {
      global: { plugins: [createPinia(), router] },
    }),
  }
}

describe('TeacherLoginView', () => {
  it('API 로그인을 위한 이메일과 비밀번호 입력 폼만 표시한다', async () => {
    const { wrapper } = await mountLoginView()

    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.find<HTMLInputElement>('#login-email').element.value).toBe('')
    expect(wrapper.find<HTMLInputElement>('#login-password').element.value).toBe('')
    expect(wrapper.findAll('button[type="submit"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('Mock')
    expect(wrapper.text()).not.toContain('목업')
  })

  it('비밀번호 재설정 성공 query를 표시한 뒤 URL에서 제거한다', async () => {
    const { router, wrapper } = await mountLoginView('/login?passwordReset=success')
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(true)
    expect(router.currentRoute.value.query.passwordReset).toBeUndefined()
  })
})

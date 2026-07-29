import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherResetPasswordView from './TeacherResetPasswordView.vue'
import { authRepositories, type TeacherProfile } from '@/features/teacher/auth'
import { ApiError } from '@/lib/api'
import { useSessionStore } from '@/stores/session'

const teacher: TeacherProfile = {
  email: 'teacher@example.com',
  name: '교수자',
  organization: null,
  gender: null,
  profileImageUrl: null,
}

async function mountResetPasswordView(token?: string) {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/reset-password',
        name: 'teacher-reset-password',
        component: TeacherResetPasswordView,
      },
      { path: '/login', name: 'teacher-login', component: { template: '<div />' } },
    ],
  })
  await router.push({
    name: 'teacher-reset-password',
    query: token ? { token } : undefined,
  })
  await router.isReady()

  return {
    pinia,
    router,
    wrapper: mount(TeacherResetPasswordView, {
      attachTo: document.body,
      global: {
        plugins: [pinia, router],
      },
    }),
  }
}

describe('TeacherResetPasswordView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('가입 여부를 노출하지 않는 재설정 링크 요청 안내를 표시한다', async () => {
    const requestPasswordReset = vi
      .spyOn(authRepositories.auth, 'requestPasswordReset')
      .mockResolvedValue(undefined)
    const { wrapper } = await mountResetPasswordView()

    await wrapper.find<HTMLInputElement>('#reset-email').setValue(' teacher@example.com ')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(requestPasswordReset).toHaveBeenCalledWith({
      email: 'teacher@example.com',
    })
    expect(wrapper.text()).toContain('가입된 이메일이라면')
    expect(wrapper.text()).toContain('10분 동안 사용할 수 있는')
    expect(wrapper.find('#reset-email').exists()).toBe(false)
  })

  it('URL의 일회용 토큰으로 비밀번호를 변경하고 기존 세션을 제거한다', async () => {
    const confirmPasswordReset = vi
      .spyOn(authRepositories.auth, 'confirmPasswordReset')
      .mockResolvedValue(undefined)
    const { pinia, router, wrapper } = await mountResetPasswordView('reset-token')
    const session = useSessionStore(pinia)
    session.initialize(teacher, 'access-token')

    await wrapper.find<HTMLInputElement>('#new-password').setValue('new-password')
    await wrapper.find<HTMLInputElement>('#password-confirmation').setValue('new-password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(confirmPasswordReset).toHaveBeenCalledWith({
      token: 'reset-token',
      newPassword: 'new-password',
    })
    expect(session.status).toBe('anonymous')
    expect(session.accessToken).toBeNull()
    expect(session.teacher).toBeNull()
    expect(router.currentRoute.value.name).toBe('teacher-login')
    expect(router.currentRoute.value.query.passwordReset).toBe('success')
  })

  it('만료된 링크 오류를 표시하고 재설정 화면에 머문다', async () => {
    vi.spyOn(authRepositories.auth, 'confirmPasswordReset').mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'PASSWORD_RESET_TOKEN_EXPIRED',
        message: '내부 오류',
      }),
    )
    const { router, wrapper } = await mountResetPasswordView('expired-token')

    await wrapper.find<HTMLInputElement>('#new-password').setValue('new-password')
    await wrapper.find<HTMLInputElement>('#password-confirmation').setValue('new-password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe(
      '비밀번호 재설정 링크가 만료되었습니다. 새 링크를 요청해 주세요.',
    )
    expect(router.currentRoute.value.name).toBe('teacher-reset-password')
  })

  it('요청과 확인 입력 오류가 발생한 첫 필드로 focus를 이동한다', async () => {
    const requestView = await mountResetPasswordView()
    await requestView.wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(document.activeElement).toBe(requestView.wrapper.get('#reset-email').element)

    requestView.wrapper.unmount()
    const confirmView = await mountResetPasswordView('reset-token')
    await confirmView.wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(document.activeElement).toBe(confirmView.wrapper.get('#new-password').element)
    expect(confirmView.wrapper.get('#new-password').attributes('aria-invalid')).toBe('true')
  })
})

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

async function mountResetPasswordView() {
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
  await router.push('/reset-password')
  await router.isReady()

  return {
    pinia,
    router,
    wrapper: mount(TeacherResetPasswordView, {
      global: {
        plugins: [pinia, router],
      },
    }),
  }
}

async function moveToPasswordStep(wrapper: ReturnType<typeof mount>) {
  await wrapper.find<HTMLInputElement>('#reset-email').setValue(' teacher@example.com ')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('TeacherResetPasswordView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('검증 코드 발송 기능 없이 목표 필드만 전송하고 기존 세션을 제거한다', async () => {
    const resetPassword = vi
      .spyOn(authRepositories.auth, 'resetPassword')
      .mockResolvedValue(undefined)
    const { pinia, router, wrapper } = await mountResetPasswordView()
    const session = useSessionStore(pinia)
    session.initialize(teacher, 'access-token')

    expect(wrapper.text()).not.toContain('인증 코드 발송')
    expect(wrapper.text()).not.toContain('데모 코드')
    await moveToPasswordStep(wrapper)
    expect(resetPassword).not.toHaveBeenCalled()

    await wrapper.find<HTMLInputElement>('#verification-code').setValue(' verification-code ')
    await wrapper.find<HTMLInputElement>('#new-password').setValue('new-password')
    await wrapper.find<HTMLInputElement>('#password-confirmation').setValue('new-password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(resetPassword).toHaveBeenCalledWith({
      email: 'teacher@example.com',
      verificationCode: 'verification-code',
      newPassword: 'new-password',
    })
    expect(session.status).toBe('anonymous')
    expect(session.accessToken).toBeNull()
    expect(session.teacher).toBeNull()
    expect(router.currentRoute.value.name).toBe('teacher-login')
    expect(router.currentRoute.value.query.passwordReset).toBe('success')
  })

  it('검증 코드 오류를 표시하고 비밀번호 입력 단계에 머문다', async () => {
    vi.spyOn(authRepositories.auth, 'resetPassword').mockRejectedValue(
      new ApiError({
        status: 400,
        code: 'INVALID_VERIFICATION_CODE',
        message: '내부 오류',
      }),
    )
    const { router, wrapper } = await mountResetPasswordView()
    await moveToPasswordStep(wrapper)

    await wrapper.find<HTMLInputElement>('#verification-code').setValue('wrong-code')
    await wrapper.find<HTMLInputElement>('#new-password').setValue('new-password')
    await wrapper.find<HTMLInputElement>('#password-confirmation').setValue('new-password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('검증 코드가 올바르지 않습니다.')
    expect(router.currentRoute.value.name).toBe('teacher-reset-password')
  })
})

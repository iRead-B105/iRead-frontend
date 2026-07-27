import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TeacherSignupView from './TeacherSignupView.vue'
import { authRepositories } from '@/features/teacher/auth'
import { ApiError } from '@/lib/api'

async function mountSignupView() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/signup', name: 'teacher-signup', component: TeacherSignupView },
      { path: '/login', name: 'teacher-login', component: { template: '<div />' } },
    ],
  })
  await router.push('/signup')
  await router.isReady()

  return {
    router,
    wrapper: mount(TeacherSignupView, {
      global: {
        plugins: [createPinia(), router],
      },
    }),
  }
}

async function fillValidSignUpForm(wrapper: ReturnType<typeof mount>) {
  await wrapper.find<HTMLInputElement>('#signup-email').setValue(' teacher@example.com ')
  await wrapper.find<HTMLInputElement>('#signup-password').setValue('password')
  await wrapper.find<HTMLInputElement>('#signup-password-confirm').setValue('password')
  await wrapper.find<HTMLInputElement>('#signup-name').setValue(' 교수자 ')
  await wrapper.find<HTMLInputElement>('#signup-organization').setValue(' iRead 센터 ')
}

describe('TeacherSignupView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('계약 필드만 trim하여 회원가입 API에 보내고 로그인으로 이동한다', async () => {
    const signUp = vi.spyOn(authRepositories.auth, 'signUp').mockResolvedValue({
      teacherId: '1',
      email: 'teacher@example.com',
      signUpStatus: 'COMPLETED',
    })
    const { router, wrapper } = await mountSignupView()
    await fillValidSignUpForm(wrapper)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(signUp).toHaveBeenCalledWith({
      email: 'teacher@example.com',
      password: 'password',
      name: '교수자',
      organization: 'iRead 센터',
    })
    expect(signUp.mock.calls[0]?.[0]).not.toHaveProperty('gender')
    expect(signUp.mock.calls[0]?.[0]).not.toHaveProperty('passwordConfirm')
    expect(signUp.mock.calls[0]?.[0]).not.toHaveProperty('profileImage')
    expect(router.currentRoute.value.name).toBe('teacher-login')
  })

  it('제출 중 중복 회원가입 요청을 막는다', async () => {
    let resolveSignUp!: () => void
    const signUp = vi.spyOn(authRepositories.auth, 'signUp').mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = () =>
          resolve({
            teacherId: '1',
            email: 'teacher@example.com',
            signUpStatus: 'COMPLETED',
          })
      }),
    )
    const { wrapper } = await mountSignupView()
    await fillValidSignUpForm(wrapper)

    await wrapper.find('form').trigger('submit')
    await wrapper.find('form').trigger('submit')

    expect(signUp).toHaveBeenCalledOnce()
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    resolveSignUp()
    await flushPromises()
  })

  it('이메일 중복 오류를 사용자 안내로 표시한다', async () => {
    vi.spyOn(authRepositories.auth, 'signUp').mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: '내부 오류',
      }),
    )
    const { wrapper } = await mountSignupView()
    await fillValidSignUpForm(wrapper)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toBe('이미 가입된 이메일입니다.')
  })
})

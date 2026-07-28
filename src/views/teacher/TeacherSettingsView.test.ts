import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileImageEditor from '@/components/teacher/ProfileImageEditor.vue'
import {
  authRepositories,
  type TeacherProfile,
} from '@/features/teacher/auth'
import { ApiError } from '@/lib/api'
import { useSessionStore } from '@/stores/session'
import TeacherSettingsView from './TeacherSettingsView.vue'

const profile: TeacherProfile = {
  email: 'teacher@example.com',
  name: '이선생',
  organization: 'iRead 센터',
  gender: 'FEMALE',
  profileImageUrl: '/images/teacher-a.png',
}

const bodyUpdatedProfile: TeacherProfile = {
  ...profile,
  name: '박선생',
  organization: null,
}

async function mountSettingsView() {
  const pinia = createPinia()
  const session = useSessionStore(pinia)
  session.initialize(
    {
      ...profile,
      name: '이전 정보',
    },
    'access-token',
  )

  const wrapper = mount(TeacherSettingsView, {
    attachTo: document.body,
    global: {
      plugins: [pinia],
    },
  })
  await flushPromises()
  return { pinia, session, wrapper }
}

function selectImage(wrapper: ReturnType<typeof mount>, file: File): void {
  wrapper.getComponent(ProfileImageEditor).vm.$emit('select', file)
}

describe('TeacherSettingsView', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(authRepositories.teacher, 'getInfo').mockResolvedValue(profile)
    vi.spyOn(authRepositories.teacher, 'updateProfile').mockResolvedValue(bodyUpdatedProfile)
    vi.spyOn(authRepositories.teacher, 'updateProfileImage').mockResolvedValue({
      ...bodyUpdatedProfile,
      profileImageUrl: '/images/teacher-b.png',
    })
  })

  it('진입할 때 최신 프로필을 조회하고 session 교수자만 교체한다', async () => {
    const { session, wrapper } = await mountSettingsView()

    expect(authRepositories.teacher.getInfo).toHaveBeenCalledOnce()
    expect(wrapper.get<HTMLInputElement>('#teacher-name').element.value).toBe('이선생')
    expect(wrapper.get<HTMLInputElement>('#teacher-email').element.value).toBe(
      'teacher@example.com',
    )
    expect(wrapper.get('#teacher-email').attributes('readonly')).toBeDefined()
    expect(session.teacher).toEqual(profile)
    expect(session.status).toBe('authenticated')
    expect(session.accessToken).toBe('access-token')
    expect(wrapper.text()).not.toContain('연락처')
    expect(wrapper.text()).not.toContain('주소')
  })

  it('조회 실패 시 고정 프로필을 표시하지 않고 재시도 상태를 보여 준다', async () => {
    vi.mocked(authRepositories.teacher.getInfo).mockRejectedValueOnce(
      new ApiError({
        status: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: '내부 서버 메시지',
      }),
    )

    const { wrapper } = await mountSettingsView()

    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toContain('서버 오류가 발생했습니다')
    expect(wrapper.text()).not.toContain('내부 서버 메시지')
  })

  it('기본 정보 PATCH 후 사진 PATCH를 순서대로 실행하고 이메일을 보내지 않는다', async () => {
    const { session, wrapper } = await mountSettingsView()
    const updateProfile = vi.mocked(authRepositories.teacher.updateProfile)
    const updateProfileImage = vi.mocked(authRepositories.teacher.updateProfileImage)
    const image = new File(['image'], 'teacher.png', { type: 'image/png' })
    await wrapper.get<HTMLInputElement>('#teacher-name').setValue(' 박선생 ')
    await wrapper.get<HTMLInputElement>('#organization').setValue(' ')
    selectImage(wrapper, image)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authRepositories.teacher.updateProfile).toHaveBeenCalledWith({
      name: '박선생',
      organization: null,
      gender: 'FEMALE',
    })
    expect(updateProfile.mock.calls[0]?.[0]).not.toHaveProperty('email')
    expect(authRepositories.teacher.updateProfileImage).toHaveBeenCalledWith(image)
    expect(updateProfile.mock.invocationCallOrder[0]).toBeLessThan(
      updateProfileImage.mock.invocationCallOrder[0] ?? 0,
    )
    expect(session.teacher?.profileImageUrl).toBe('/images/teacher-b.png')
  })

  it('기본 정보 저장 실패 시 사진 요청을 실행하지 않는다', async () => {
    vi.mocked(authRepositories.teacher.updateProfile).mockRejectedValueOnce(
      new ApiError({
        status: 400,
        code: 'INVALID_INPUT',
        message: '서버 원문',
      }),
    )
    const { wrapper } = await mountSettingsView()
    await wrapper.get<HTMLInputElement>('#teacher-name').setValue('박선생')
    selectImage(wrapper, new File(['image'], 'teacher.png', { type: 'image/png' }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authRepositories.teacher.updateProfileImage).not.toHaveBeenCalled()
    expect(wrapper.get('[role="alert"]').text()).toBe('프로필 정보를 저장하지 못했습니다.')
  })

  it('사진 저장만 실패하면 기본 정보를 유지하고 같은 파일로 재시도한다', async () => {
    vi.mocked(authRepositories.teacher.updateProfileImage)
      .mockRejectedValueOnce(new Error('image failed'))
      .mockResolvedValueOnce({
        ...bodyUpdatedProfile,
        profileImageUrl: '/images/teacher-b.png',
      })
    const { session, wrapper } = await mountSettingsView()
    const image = new File(['image'], 'teacher.png', { type: 'image/png' })
    await wrapper.get<HTMLInputElement>('#teacher-name').setValue('박선생')
    await wrapper.get<HTMLInputElement>('#organization').setValue('')
    selectImage(wrapper, image)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(session.teacher).toEqual(bodyUpdatedProfile)
    expect(wrapper.get('[role="alert"]').text()).toBe(
      '기본 정보는 저장됐지만 사진 변경에 실패했습니다.',
    )
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authRepositories.teacher.updateProfile).toHaveBeenCalledOnce()
    expect(authRepositories.teacher.updateProfileImage).toHaveBeenCalledTimes(2)
    expect(authRepositories.teacher.updateProfileImage).toHaveBeenLastCalledWith(image)
    expect(session.teacher?.profileImageUrl).toBe('/images/teacher-b.png')
  })

  it('사진만 바뀌면 기본 정보 PATCH를 건너뛴다', async () => {
    const { wrapper } = await mountSettingsView()
    const image = new File(['image'], 'teacher.png', { type: 'image/png' })
    selectImage(wrapper, image)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(authRepositories.teacher.updateProfile).not.toHaveBeenCalled()
    expect(authRepositories.teacher.updateProfileImage).toHaveBeenCalledWith(image)
  })

  it('검증 실패 시 첫 오류 field로 focus한다', async () => {
    const { wrapper } = await mountSettingsView()
    const name = wrapper.get<HTMLInputElement>('#teacher-name')
    await name.setValue('')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(name.attributes('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(name.element)
  })
})

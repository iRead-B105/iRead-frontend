import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resolveAuthenticatedProfileImage } = vi.hoisted(() => ({
  resolveAuthenticatedProfileImage: vi.fn(),
}))
vi.mock('@/features/teacher/authenticatedProfileImage', () => ({
  resolveAuthenticatedProfileImage,
}))

import AuthenticatedImage from './AuthenticatedImage.vue'

describe('AuthenticatedImage', () => {
  beforeEach(() => resolveAuthenticatedProfileImage.mockReset())

  it('renders the authenticated image result and releases it when replaced', async () => {
    const revokeFirst = vi.fn()
    const revokeSecond = vi.fn()
    resolveAuthenticatedProfileImage
      .mockResolvedValueOnce({ url: 'blob:first', revoke: revokeFirst })
      .mockResolvedValueOnce({ url: 'blob:second', revoke: revokeSecond })

    const wrapper = mount(AuthenticatedImage, {
      props: { src: '/uploads/images/first.png', alt: '아동 프로필' },
      attrs: { class: 'avatar' },
    })
    await flushPromises()

    expect(wrapper.get('img').attributes()).toMatchObject({
      src: 'blob:first',
      alt: '아동 프로필',
      class: 'avatar',
    })

    await wrapper.setProps({ src: '/uploads/images/second.png' })
    await flushPromises()

    expect(revokeFirst).toHaveBeenCalledOnce()
    expect(wrapper.get('img').attributes('src')).toBe('blob:second')

    wrapper.unmount()
    expect(revokeSecond).toHaveBeenCalledOnce()
  })
})

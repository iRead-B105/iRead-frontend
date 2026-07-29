import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TeacherLayout from './TeacherLayout.vue'

describe('TeacherLayout accessibility', () => {
  it('반복 navigation보다 먼저 본문 바로가기와 main landmark를 제공한다', () => {
    const wrapper = mount(TeacherLayout, {
      global: {
        stubs: {
          TeacherSidebar: { template: '<aside />' },
          RouterView: { template: '<div />' },
        },
      },
    })

    expect(wrapper.get('.skip-link').attributes('href')).toBe('#main-content')
    expect(wrapper.get('main').attributes('id')).toBe('main-content')
    expect(wrapper.get('main').attributes('tabindex')).toBe('-1')
  })
})

import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { studentFixtures } from '@/features/teacher/student/fixtures'
import { toStudentNavigationItem } from '@/features/teacher/student'
import StudentSwitcher from './StudentSwitcher.vue'

function mountSwitcher() {
  return mount(StudentSwitcher, {
    attachTo: document.body,
    props: {
      currentStudent: toStudentNavigationItem(studentFixtures[0]!),
    },
    global: {
      plugins: [createPinia()],
    },
  })
}

describe('StudentSwitcher accessibility', () => {
  it('열릴 때 검색으로 focus하고 Escape 후 trigger로 복귀한다', async () => {
    const wrapper = mountSwitcher()
    const trigger = wrapper.get<HTMLButtonElement>('.student-switcher__trigger')
    trigger.element.focus()

    await trigger.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(wrapper.get('#student-switcher-search').element)

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    await flushPromises()

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('마지막 action에서 Tab을 누르면 검색 field로 순환한다', async () => {
    const wrapper = mountSwitcher()
    await wrapper.get('.student-switcher__trigger').trigger('click')
    await flushPromises()

    const manageButton = wrapper.get<HTMLButtonElement>('.manage')
    manageButton.element.focus()
    await manageButton.trigger('keydown', { key: 'Tab' })

    expect(document.activeElement).toBe(wrapper.get('#student-switcher-search').element)
    wrapper.unmount()
  })
})

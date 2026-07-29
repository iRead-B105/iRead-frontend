import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from './ConfirmDialog.vue'

describe('ConfirmDialog', () => {
  it('확인 동작에서 cancel보다 confirm을 우선 전달한다', async () => {
    const wrapper = mount(ConfirmDialog, {
      attachTo: document.body,
      props: {
        open: true,
        title: '삭제 확인',
        message: '선택한 항목을 삭제합니다.',
        confirmLabel: '항목 삭제',
      },
    })
    await flushPromises()

    const confirmButton = [...document.body.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === '항목 삭제',
    )
    expect(confirmButton).toBeDefined()
    confirmButton?.click()
    await flushPromises()

    expect(wrapper.emitted('confirm')).toEqual([[]])
    expect(wrapper.emitted('cancel')).toBeUndefined()
    wrapper.unmount()
  })
})

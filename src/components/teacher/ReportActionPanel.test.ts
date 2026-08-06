import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReportActionPanel from './ReportActionPanel.vue'

describe('ReportActionPanel', () => {
  it('보고서 목록 버튼이 존재하지 않고 저장 버튼이 취소 버튼보다 먼저 위치한다', () => {
    const wrapper = mount(ReportActionPanel, {
      props: {
        memoDirty: true,
        memoValid: true,
        memoStatus: 'idle',
      },
    })

    expect(wrapper.text()).not.toContain('보고서 목록')

    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.text()).toBe('저장')
    expect(buttons[1]!.text()).toBe('취소')
  })

  it('저장 중 일때는 버튼 텍스트가 저장 중…으로 변경된다', () => {
    const wrapper = mount(ReportActionPanel, {
      props: {
        memoDirty: true,
        memoValid: true,
        memoStatus: 'saving',
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0]!.text()).toBe('저장 중…')
    expect(buttons[0]!.attributes('disabled')).toBeDefined()
    expect(buttons[1]!.attributes('disabled')).toBeDefined()
  })
})

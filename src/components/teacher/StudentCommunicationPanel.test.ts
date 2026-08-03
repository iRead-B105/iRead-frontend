import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudentCommunicationPanel from './StudentCommunicationPanel.vue'

describe('StudentCommunicationPanel', () => {
  it('trim된 메모 1,001자를 거부하고 저장 action을 비활성화한다', async () => {
    const wrapper = mount(StudentCommunicationPanel, {
      props: {
        noteDraft: '',
        savedValue: null,
        'onUpdate:noteDraft': (value: string) => wrapper.setProps({ noteDraft: value }),
      },
    })

    expect(wrapper.get('h2').text()).toBe('학습 기록')
    expect(wrapper.find('label').exists()).toBe(false)
    expect(wrapper.get('textarea').attributes('aria-label')).toBe('학습 기록')

    await wrapper.get('textarea').setValue('가'.repeat(1001))

    expect(wrapper.text()).toContain('1,000자 이내')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('saveNote')).toBeUndefined()
  })

  it('기존 메모가 있을 때 빈 값 저장을 삭제 action으로 제공한다', async () => {
    const wrapper = mount(StudentCommunicationPanel, {
      props: {
        noteDraft: '기존 메모',
        savedValue: '기존 메모',
        'onUpdate:noteDraft': (value: string) => wrapper.setProps({ noteDraft: value }),
      },
    })

    await wrapper.get('textarea').setValue('   ')

    expect(wrapper.get('button').text()).toBe('메모 삭제')
    expect(wrapper.get('button').attributes('disabled')).toBeUndefined()
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('saveNote')).toEqual([['   ']])
  })
})

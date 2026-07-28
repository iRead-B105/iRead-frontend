import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AsyncStatePanel from './AsyncStatePanel.vue'

describe('AsyncStatePanel', () => {
  it('loading 상태를 polite status로 표시한다', () => {
    const wrapper = mount(AsyncStatePanel, {
      props: {
        kind: 'loading',
        message: '아동 정보를 불러오고 있습니다.',
      },
    })

    const panel = wrapper.get('[role="status"]')
    expect(panel.attributes('aria-live')).toBe('polite')
    expect(panel.attributes('aria-busy')).toBe('true')
    expect(panel.text()).toContain('불러오는 중입니다')
    expect(panel.text()).toContain('아동 정보를 불러오고 있습니다.')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('empty 상태는 오류 alert로 표시하지 않는다', () => {
    const wrapper = mount(AsyncStatePanel, {
      props: {
        kind: 'empty',
        title: '등록된 아동이 없습니다',
        message: '첫 아동을 등록하면 학습 현황을 확인할 수 있습니다.',
      },
    })

    expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('등록된 아동이 없습니다')
  })

  it('error 상태에서 retry event를 전달한다', async () => {
    const wrapper = mount(AsyncStatePanel, {
      props: {
        kind: 'error',
        message: '잠시 후 다시 시도해 주세요.',
        retryLabel: '다시 시도',
      },
    })

    const panel = wrapper.get('[role="alert"]')
    expect(panel.attributes('aria-live')).toBe('assertive')

    await wrapper.get('button').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('action')).toBeUndefined()
  })

  it.each(['forbidden', 'not-found'] as const)(
    '%s 상태에서 일반 action event를 전달한다',
    async (kind) => {
      const wrapper = mount(AsyncStatePanel, {
        props: {
          kind,
          message: '목록으로 돌아가 다시 선택해 주세요.',
          actionLabel: '목록으로 이동',
          compact: true,
        },
      })

      expect(wrapper.classes()).toContain('is-compact')
      expect(wrapper.get('[role="alert"]').attributes('data-kind')).toBe(kind)

      await wrapper.get('button').trigger('click')

      expect(wrapper.emitted('action')).toHaveLength(1)
    },
  )

  it('retry와 일반 action을 독립적으로 노출한다', async () => {
    const wrapper = mount(AsyncStatePanel, {
      props: {
        kind: 'error',
        message: '요청을 완료하지 못했습니다.',
        retryLabel: '다시 시도',
        actionLabel: '목록으로 이동',
      },
    })

    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['다시 시도', '목록으로 이동'])

    await buttons[0]?.trigger('click')
    await buttons[1]?.trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('default slot으로 화면별 설명을 확장한다', () => {
    const wrapper = mount(AsyncStatePanel, {
      props: {
        kind: 'empty',
        message: '검색 조건을 변경해 주세요.',
      },
      slots: {
        default: '<span data-test="details">검색어를 초기화할 수 있습니다.</span>',
      },
    })

    expect(wrapper.get('[data-test="details"]').text()).toBe('검색어를 초기화할 수 있습니다.')
  })
})

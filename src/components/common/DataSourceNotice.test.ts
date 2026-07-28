import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import DataSourceNotice from './DataSourceNotice.vue'

describe('DataSourceNotice', () => {
  it('mock 모드에서는 Backend 미연동 상태를 안내한다', () => {
    const wrapper = mount(DataSourceNotice, {
      props: {
        dataSource: 'mock',
      },
    })

    expect(wrapper.get('[role="status"]').text()).toBe(
      'Backend와 연동 전 입니다. 변경한 mock 데이터는 새로고침하면 초기화됩니다.',
    )
  })

  it('api 모드에서는 안내를 표시하지 않는다', () => {
    const wrapper = mount(DataSourceNotice, {
      props: {
        dataSource: 'api',
      },
    })

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })
})

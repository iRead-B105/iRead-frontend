import { createPinia, setActivePinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  REALTIME_FRESHNESS_WARNING_DELAY_MS,
  useRealtimeFreshnessStore,
} from '@/stores/realtimeFreshness'
import TeacherLayout from './TeacherLayout.vue'

function mountLayout() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(TeacherLayout, {
    global: {
      plugins: [pinia],
      stubs: {
        TeacherSidebar: { template: '<aside />' },
        RouterView: { template: '<div />' },
      },
    },
  })
  return { wrapper, store: useRealtimeFreshnessStore(pinia) }
}

describe('TeacherLayout accessibility', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('반복 navigation보다 먼저 본문 바로가기와 main landmark를 제공한다', () => {
    const { wrapper } = mountLayout()

    expect(wrapper.get('.skip-link').attributes('href')).toBe('#main-content')
    expect(wrapper.get('main').attributes('id')).toBe('main-content')
    expect(wrapper.get('main').attributes('tabindex')).toBe('-1')
  })

  it('3초 이상 최신화되지 않을 때만 마지막 갱신 시각과 재시도를 표시한다', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-31T10:00:00+09:00'))
    const { wrapper, store } = mountLayout()
    store.setContext('teacher-students', ['global'])
    const successGeneration = store.beginRefresh('global', 'teacher-students')
    store.markRefreshSuccess('global', 'teacher-students', successGeneration)
    const failureGeneration = store.beginRefresh('global', 'teacher-students')
    store.markRefreshFailure('global', 'teacher-students', failureGeneration)

    vi.advanceTimersByTime(REALTIME_FRESHNESS_WARNING_DELAY_MS - 1)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[aria-label="데이터 최신성 안내"]').exists()).toBe(false)

    vi.advanceTimersByTime(1)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('연결이 불안정하여 최신 정보가 아닐 수 있습니다.')
    expect(wrapper.text()).toContain('마지막 갱신')
    await wrapper.get('button').trigger('click')
    expect(store.retryRequestVersion).toBe(1)
    expect(wrapper.text()).toContain('다시 시도 중')
  })
})

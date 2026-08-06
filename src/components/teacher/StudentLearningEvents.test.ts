import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudentLearningEvents from './StudentLearningEvents.vue'
import type { StudentLearningEvent } from '@/features/teacher/student'

const events: readonly StudentLearningEvent[] = [
  {
    eventId: 701,
    eventType: 'TRAINING',
    occurredAt: '2026-07-28T16:00:00+09:00',
    sourceId: 91,
    accuracy: 68,
    attentionRequired: true,
    attentionReasons: ['LOW_ACCURACY'],
  },
  {
    eventId: 699,
    eventType: 'GAZE',
    occurredAt: '2026-07-27T16:00:00+09:00',
    sourceId: 89,
    accuracy: null,
    attentionRequired: false,
    attentionReasons: [],
  },
]

describe('StudentLearningEvents', () => {
  it('최근 학습 기록을 펼침이나 포커스가 없는 읽기 전용 카드로 표시한다', () => {
    const wrapper = mount(StudentLearningEvents, {
      props: { events, listStatus: 'success' },
    })

    const cards = wrapper.findAll('.learning-event')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('읽기 훈련')
    expect(cards[0]!.text()).toContain('68%')
    expect(cards[1]!.text()).toContain('시선 분석')
    expect(wrapper.find('.learning-event-list button').exists()).toBe(false)
    expect(wrapper.find('[tabindex]').exists()).toBe(false)
    expect(wrapper.find('[aria-expanded]').exists()).toBe(false)
    expect(wrapper.find('.event-detail-shell').exists()).toBe(false)
  })

  it('목록 조회 오류에서만 다시 시도 이벤트를 제공한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        events: [],
        listStatus: 'error',
        listError: '연결 실패',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('최근 학습 이벤트를 불러오지 못했습니다.')
    expect(wrapper.text()).toContain('연결 실패')
    expect(wrapper.emitted('retryList')).toHaveLength(1)
  })
})

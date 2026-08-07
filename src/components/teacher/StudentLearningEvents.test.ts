import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudentLearningEvents from './StudentLearningEvents.vue'
import type { StudentTrainingHistoryItem } from '@/features/teacher/student'

const history: readonly StudentTrainingHistoryItem[] = [
  {
    trainingId: 701,
    date: '2026-07-28',
    learningType: '낱말 읽기 훈련',
    startedAt: '2026-07-28T15:50:00+09:00',
    finishedAt: '2026-07-28T16:00:00+09:00',
    achievement: 68,
  },
  {
    trainingId: 699,
    date: '2026-07-27',
    learningType: '음성 녹음 훈련',
    startedAt: '2026-07-27T15:50:00+09:00',
    finishedAt: '2026-07-27T16:00:00+09:00',
    achievement: 75,
  },
]

describe('StudentLearningEvents', () => {
  it('최근 학습 기록을 펼침이나 포커스가 없는 읽기 전용 카드로 표시한다', () => {
    const wrapper = mount(StudentLearningEvents, {
      props: { history, listStatus: 'success' },
    })

    const cards = wrapper.findAll('.learning-event')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('낱말 읽기 훈련')
    expect(cards[0]!.text()).toContain('68%')
    expect(cards[1]!.text()).toContain('음성 녹음 훈련')
    expect(cards[1]!.text()).toContain('75%')
    expect(wrapper.find('.learning-event-list button').exists()).toBe(false)
    expect(wrapper.find('[tabindex]').exists()).toBe(false)
    expect(wrapper.find('[aria-expanded]').exists()).toBe(false)
    expect(wrapper.find('.event-detail-shell').exists()).toBe(false)
  })

  it('목록 조회 오류에서만 다시 시도 이벤트를 제공한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        history: [],
        listStatus: 'error',
        listError: '연결 실패',
      },
    })

    await wrapper.get('button').trigger('click')

    expect(wrapper.text()).toContain('최근 학습 이력을 불러오지 못했습니다.')
    expect(wrapper.text()).toContain('연결 실패')
    expect(wrapper.emitted('retryList')).toHaveLength(1)
  })

  it('정확도가 없는 이력을 0%로 오해하지 않게 표시한다', () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        history: [{ ...history[0]!, achievement: null }],
        listStatus: 'success',
      },
    })

    expect(wrapper.text()).toContain('정확도 미측정')
    expect(wrapper.text()).not.toContain('0%')
  })
})

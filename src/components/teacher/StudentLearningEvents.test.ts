import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudentLearningEvents from './StudentLearningEvents.vue'
import type { StudentLearningEvent, StudentLearningEventDetail } from '@/features/teacher/student'

const events: readonly StudentLearningEvent[] = [
  {
    eventId: 701,
    eventType: 'TRAINING',
    occurredAt: '2026-07-27T16:00:00+09:00',
    sourceId: 91,
    accuracy: 68,
    attentionRequired: true,
    attentionReasons: ['LOW_ACCURACY'],
  },
  {
    eventId: 699,
    eventType: 'GAZE',
    occurredAt: '2026-07-26T16:00:00+09:00',
    sourceId: 89,
    accuracy: null,
    attentionRequired: false,
    attentionReasons: [],
  },
]

const detail: StudentLearningEventDetail = {
  ...events[0]!,
  retryCount: 2,
  problemSegments: ['받침 ㄹ 발음'],
  recommendedTrainingTemplateId: 301,
  recommendedCurriculumUnitId: 31,
  recommendedCurriculumUnitName: '받침이 있는 문장 읽기',
  recommendationReason: '최근 6주 정확도가 가장 낮은 영역입니다.',
  recommendedMinutes: 10,
  recommendedRepeatCount: 2,
}

describe('StudentLearningEvents', () => {
  it('이벤트 목록의 실제 eventId를 선택 이벤트로 전달한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: { events, listStatus: 'success' },
    })

    await wrapper.findAll('button')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([[events[1]]])
    expect(wrapper.text()).toContain('시선 분석')
    expect(wrapper.text()).not.toContain('정확도 없음')
    expect(wrapper.text()).not.toContain('확인 완료')
  })

  it('선택한 카드 안에서 학습 결과·교수자 확인·다음 제안을 함께 표시한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        events,
        selectedEventId: 701,
        selectedEventType: 'TRAINING',
        detail,
        listStatus: 'success',
        detailStatus: 'success',
      },
    })

    const expandedItem = wrapper.get('.learning-event-item.is-expanded')
    expect(expandedItem.get('.learning-event').attributes('aria-expanded')).toBe('true')
    expect(expandedItem.get('.event-detail-shell').element.parentElement).toBe(expandedItem.element)
    expect(expandedItem.text()).toContain('학습 결과')
    expect(expandedItem.text()).toContain('교수자 확인')
    expect(expandedItem.text()).toContain('다음 학습 제안')
    expect(expandedItem.text()).toContain('받침이 있는 문장 읽기')
    expect(expandedItem.text()).toContain('최근 6주 정확도가 가장 낮은 영역입니다.')
    expect(expandedItem.text()).not.toContain('권장 시간')
    expect(expandedItem.text()).not.toContain('권장 반복')
    expect(expandedItem.text()).not.toContain('10분')
    expect(expandedItem.text()).toContain('받침 ㄹ 발음')
    expect(wrapper.findAll('.event-detail')).toHaveLength(1)

    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('상세 이력 보기'))!
      .trigger('click')
    expect(wrapper.emitted('openHistory')).toEqual([['TRAINING']])
  })

  it('문제 구간과 추천이 없으면 별도 빈 상태를 표시한다', () => {
    const noRecommendation: StudentLearningEventDetail = {
      ...events[1]!,
      retryCount: 0,
      problemSegments: [],
      recommendedTrainingTemplateId: null,
      recommendedCurriculumUnitId: null,
      recommendedCurriculumUnitName: null,
      recommendationReason: null,
      recommendedMinutes: null,
      recommendedRepeatCount: null,
    }
    const wrapper = mount(StudentLearningEvents, {
      props: {
        events,
        selectedEventId: 699,
        selectedEventType: 'GAZE',
        detail: noRecommendation,
        listStatus: 'success',
        detailStatus: 'success',
      },
    })

    expect(wrapper.text()).toContain('시선 분석')
    expect(wrapper.text()).not.toContain('산정할 수 없음')
    expect(wrapper.text()).toContain('확인된 문제 구간 없음')
    expect(wrapper.text()).toContain('추가로 확인할 신호 없음')
    expect(wrapper.text()).toContain('다음 학습으로 제안된 훈련이 없습니다.')
  })

  it('상세 요청 상태가 바뀌어도 선택 카드 내부의 상세 셸을 유지한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        events,
        selectedEventId: 701,
        selectedEventType: 'TRAINING',
        listStatus: 'success',
        detailStatus: 'loading',
      },
    })

    expect(wrapper.get('.event-detail-shell').attributes('aria-busy')).toBe('true')
    expect(wrapper.text()).toContain('학습 이벤트 상세를 불러오는 중입니다.')

    await wrapper.setProps({
      detail,
      detailStatus: 'success',
    })

    expect(wrapper.get('.event-detail-shell').attributes('aria-busy')).toBeUndefined()
    expect(wrapper.get('.event-detail').text()).toContain('받침 ㄹ 발음')
  })

  it('상세 오류 재시도는 선택을 닫지 않고 retry 이벤트만 전달한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        events,
        selectedEventId: 701,
        selectedEventType: 'TRAINING',
        listStatus: 'success',
        detailStatus: 'error',
        detailError: '연결 실패',
      },
    })

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '상세 다시 시도')!
      .trigger('click')

    expect(wrapper.emitted('retryDetail')).toEqual([[events[0]]])
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.find('.event-detail-shell').exists()).toBe(true)
  })
})

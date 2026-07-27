import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StudentLearningEvents from './StudentLearningEvents.vue'
import type {
  StudentLearningEvent,
  StudentLearningEventDetail,
} from '@/features/teacher/student'

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

    expect(wrapper.emitted('select')).toEqual([[699]])
    expect(wrapper.text()).toContain('정확도 없음')
    expect(wrapper.text()).not.toContain('확인 완료')
  })

  it('Backend 추천 근거·시간·횟수를 표시하고 상세을 메모 추가 이벤트로 전달한다', async () => {
    const wrapper = mount(StudentLearningEvents, {
      props: {
        events,
        selectedEventId: 701,
        detail,
        listStatus: 'success',
        detailStatus: 'success',
      },
    })

    expect(wrapper.text()).toContain('받침이 있는 문장 읽기')
    expect(wrapper.text()).toContain('최근 6주 정확도가 가장 낮은 영역입니다.')
    expect(wrapper.text()).toContain('10분')
    expect(wrapper.text()).toContain('2회')
    expect(wrapper.text()).toContain('받침 ㄹ 발음')

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '내부 메모에 추가')!
      .trigger('click')
    expect(wrapper.emitted('addToMemo')).toEqual([[detail]])
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
        detail: noRecommendation,
        listStatus: 'success',
        detailStatus: 'success',
      },
    })

    expect(wrapper.text()).toContain('산정할 수 없음')
    expect(wrapper.text()).toContain('확인된 문제 구간 없음')
    expect(wrapper.text()).toContain('Backend에서 제공한 권장 훈련이 없습니다.')
  })
})

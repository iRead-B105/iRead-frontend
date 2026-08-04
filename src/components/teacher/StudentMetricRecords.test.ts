import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'

import StudentMetricRecords from './StudentMetricRecords.vue'

const accuracyRecords = {
  from: '2026-06-28',
  to: '2026-07-27',
  unit: 'PERCENT',
  calculationVersion: 'reading-metrics-v1',
  records: [
    {
      sourceType: 'TRAINING',
      sourceId: 91,
      trainingName: '받침 소리 구분',
      measuredAt: '2026-07-27T16:00:00+09:00',
      correctAttemptCount: 8,
      attemptCount: 10,
      accuracy: 80,
      unit: 'PERCENT',
      calculationVersion: 'reading-metrics-v1',
    },
  ],
}

const readingSpeedRecords = {
  from: '2026-06-28',
  to: '2026-07-27',
  unit: 'CORRECT_WORDS_PER_MINUTE',
  calculationVersion: 'reading-metrics-v1',
  records: [
    {
      sourceType: 'TRAINING',
      sourceId: 92,
      trainingName: '짧은 이야기 읽기',
      measuredAt: '2026-07-27T17:00:00+09:00',
      correctWordCount: 48,
      measuredDurationMs: 30_000,
      speed: 96,
      unit: 'CORRECT_WORDS_PER_MINUTE',
      calculationVersion: 'reading-metrics-v1',
    },
  ],
}

async function mountRecords(selectedTrend: 'accuracy' | 'reading-speed') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students/:id/training-history',
        name: 'student-training-history',
        component: { template: '<div />' },
      },
    ],
  })
  await router.push('/teacher/students/1/training-history')
  await router.isReady()
  const wrapper = mount(StudentMetricRecords, {
    props: {
      studentId: 1,
      selectedTrend,
      accuracyRecords,
      readingSpeedRecords,
      status: 'success',
      error: null,
    },
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('StudentMetricRecords', () => {
  it('선택한 탭의 원본 기록과 가로 상세 정보만 표시한다', async () => {
    const wrapper = await mountRecords('accuracy')

    expect(wrapper.text()).toContain('읽기 정확도 기록')
    expect(wrapper.text()).toContain('받침 소리 구분')
    expect(wrapper.text()).not.toContain('훈련 #91')
    expect(wrapper.text()).toContain('정답 8개 / 유효 시도 10개')
    expect(wrapper.text()).toContain('PERCENT · reading-metrics-v1')
    expect(wrapper.text()).not.toContain('읽기 속도 기록')
    expect(wrapper.findAll('.metric-record-detail dl > div')).toHaveLength(5)

    await wrapper.setProps({ selectedTrend: 'reading-speed' })

    expect(wrapper.text()).toContain('읽기 속도 기록')
    expect(wrapper.text()).toContain('짧은 이야기 읽기')
    expect(wrapper.text()).not.toContain('훈련 #92')
    expect(wrapper.text()).toContain('정답 단어 48개 / 유효 음성 30초')
    expect(wrapper.text()).not.toContain('읽기 정확도 기록')
    expect(wrapper.get('.metric-record-detail__link').attributes('href')).toContain(
      'trainingId=92',
    )
  })
})

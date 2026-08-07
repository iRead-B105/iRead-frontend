import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { TestTrainingRepository } from '@/test/repositories'
import { useTrainingStore } from '@/stores/training'
import StudentTrainingHistoryView from './StudentTrainingHistoryView.vue'

async function mountHistory(
  repository: TestTrainingRepository,
  initialPath = '/teacher/students/1/training-history',
) {
  const pinia = createPinia()
  const store = useTrainingStore(pinia)
  store.setRepository(repository)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>학습자 목록</div>' },
      },
      {
        path: '/teacher/students/:id/training-history',
        name: 'student-training-history',
        component: StudentTrainingHistoryView,
      },
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  const wrapper = mount(
    { template: '<RouterView />' },
    {
      global: {
        plugins: [pinia, router],
      },
    },
  )
  await flushPromises()
  return { wrapper, router, store }
}

describe('StudentTrainingHistoryView', () => {
  it('잘못된 studentId에서는 Repository를 호출하지 않고 목록 이동 action을 표시한다', async () => {
    const repository = new TestTrainingRepository()
    const getCurriculumLogs = vi.spyOn(repository, 'getCurriculumLogs')
    const { wrapper } = await mountHistory(
      repository,
      '/teacher/students/not-a-number/training-history',
    )

    expect(getCurriculumLogs).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('올바른 학습자를 선택해 주세요.')
    expect(wrapper.text()).toContain('학습자 목록으로 이동')
  })

  it('최신 커리큘럼의 평균 정확도·훈련별 정확도·문항 상세·시선 집계를 표시한다', async () => {
    const { wrapper } = await mountHistory(new TestTrainingRepository())

    const selectionCard = wrapper.get('[data-test="history-selection-card"]')
    expect(selectionCard.text()).toContain('완료한 커리큘럼')
    expect(wrapper.findAll('.history-summary-grid > [data-slot="card"]')).toHaveLength(2)
    expect(wrapper.get('.curriculum-trainings h2').text()).toBe('학습 목록')
    expect(wrapper.get('.detail-heading h2').text()).toBe('선택 훈련 상세')
    expect(wrapper.get('.detail-heading h3').text()).toBe('서로 다른 받침 음절 비교하기')
    expect(wrapper.get('.question-results').attributes('aria-label')).toBe('문항 결과')
    expect(wrapper.find('.question-results > header').exists()).toBe(false)
    expect(wrapper.get('.history-gaze-shell h2').text()).toBe('훈련 시선 분석')
    expect(wrapper.text()).not.toContain('시선트래킹')
    expect(selectionCard.text()).toContain('평균 정확도')
    expect(wrapper.get('.curriculum-overview').text()).toContain('훈련 정확도')

    expect(wrapper.text()).toContain('2026.07.20')
    expect(wrapper.text()).toContain('서로 다른 받침 음절 비교하기')
    expect(wrapper.text()).toContain('8분 30초')
    expect(wrapper.text()).not.toContain('학습 판단')
    expect(wrapper.text()).toContain('전체 문항2건')
    expect(wrapper.findAll('.question-table__row')).toHaveLength(2)
    expect(wrapper.text()).toContain('정답100점')
    expect(wrapper.text()).toContain('오답40점')
    expect(wrapper.text()).not.toContain('오답 문항에 한해 제공됩니다.')
    expect(wrapper.text()).toContain('다음 중 끝소리가 같은 낱말을 고르세요.')
    expect(wrapper.text()).toContain('보기: 꽃, 옷 / 꽃, 낮')
    // 학습자 제출 답안 열은 화면에서 제거했다(정답만 노출).
    expect(wrapper.text()).not.toContain('음성 응답 완료')
    expect(wrapper.text()).not.toContain('학습자 답')
    expect(wrapper.text()).toContain('100점')
    expect(wrapper.text()).not.toContain('선택 훈련 정확도 비교')
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('음성 읽기 속도 추이')
    expect(wrapper.text()).not.toContain('아이 트래킹 기준')
    expect(wrapper.text()).toContain('훈련 시선 분석')
    expect(wrapper.text()).toContain('42.4초')
    expect(wrapper.text()).toContain('68회')
    expect(wrapper.text()).toContain('7회')
    expect(wrapper.text()).not.toContain('의학적 진단 결과가 아닙니다.')
    expect(wrapper.text()).not.toContain('읽기 이탈')
    expect(wrapper.text()).not.toContain('권장합니다')
    expect(wrapper.text()).not.toContain('generatedData')
  })

  it('훈련 gaze에서는 공식 네 집계만 표시하고 replay 상세는 표시하지 않는다', async () => {
    const repository = new TestTrainingRepository({
      gazeByTrainingId: {
        901: {
          status: 'AVAILABLE',
          analysis: {
            gazeSessionId: 6_101,
            gazeAnalysisResultId: 7_101,
            totalVisitedDurationMs: 42_400,
            totalVisitedCount: 68,
            reverseReadCount: 7,
            avgVisitedDurationMs: 624,
            replay: {
              words: [
                {
                  questionNo: 1,
                  targetIndex: 0,
                  tokenIndex: 0,
                  text: '꽃',
                  dwellMs: 1_000,
                  visitCount: 2,
                  skipped: false,
                  regressionCount: 0,
                  firstSeenMs: 0,
                  lastSeenMs: 1_000,
                },
              ],
              samples: [],
            },
          },
        },
      },
    })
    const { wrapper } = await mountHistory(repository)

    expect(wrapper.text()).toContain('42.4초')
    expect(wrapper.text()).toContain('68회')
    expect(wrapper.text()).not.toContain('단어별 시선 머무름')
    expect(wrapper.text()).not.toContain('이동 순서')
  })

  it('훈련 선택에 따라 NO_DATA와 FAILED를 요청 오류 없이 구분한다', async () => {
    const { wrapper, store } = await mountHistory(new TestTrainingRepository())
    const rows = wrapper.findAll('.training-row')

    await rows.find((row) => row.text().includes('비슷한 소리 고르기'))?.trigger('click')
    await flushPromises()
    expect(store.historyGazeStatus).toBe('success')
    expect(wrapper.text()).toContain('시선 분석 데이터가 기록되지 않았습니다.')
    expect(wrapper.find('[data-test="chart"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('미제출')
    expect(wrapper.text()).toContain('채점 대상 아님')
    expect(wrapper.text()).toContain('정답 정보 없음')

    await rows.find((row) => row.text().includes('음절 합쳐 낱말 만들기'))?.trigger('click')
    await flushPromises()
    expect(store.historyGazeStatus).toBe('success')
    expect(wrapper.text()).toContain('시선 분석을 완료하지 못했습니다.')
  })

  it('source record 링크의 trainingId에 해당하는 훈련 상세를 선택한다', async () => {
    const { store } = await mountHistory(
      new TestTrainingRepository(),
      '/teacher/students/1/training-history?trainingId=891',
    )

    expect(store.selectedCurriculumId).toBe(189)
    expect(store.selectedHistoryTrainingId).toBe(891)
  })

  it('기간 변경을 서버 query용 값으로 Repository에 전달한다', async () => {
    const repository = new TestTrainingRepository()
    const getCurriculumLogs = vi.spyOn(repository, 'getCurriculumLogs')
    const { wrapper } = await mountHistory(repository)

    await wrapper.get('#training-period').setValue('3m')
    await flushPromises()

    expect(getCurriculumLogs).toHaveBeenLastCalledWith(
      1,
      '3m',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(wrapper.text()).toContain('2026.05.18')
  })

  it('커리큘럼 변경에는 상세 카드를 유지하고 새 훈련 선택 시에만 상세를 갱신한다', async () => {
    const { wrapper, store } = await mountHistory(new TestTrainingRepository())
    const detailCard = wrapper.get('.detail-card').element
    const detailMetrics = wrapper.get('.detail-metrics').element
    const firstQuestion = wrapper.get('.question-table__row').element
    const zeroCurriculum = wrapper
      .findAll('.curriculum-row')
      .find((row) => row.text().includes('2026.07.05'))

    await zeroCurriculum?.trigger('click')
    await flushPromises()

    expect(store.selectedCurriculumId).toBe(189)
    expect(store.selectedHistoryTrainingId).toBe(901)
    expect(store.historyTrainingDetail?.trainingId).toBe(901)
    expect(wrapper.get('.detail-card').element).toBe(detailCard)
    expect(wrapper.get('.detail-metrics').element).toBe(detailMetrics)
    expect(wrapper.get('.question-table__row').element).toBe(firstQuestion)
    expect(zeroCurriculum?.text()).toContain('0%')

    await wrapper.findAll('.training-row')[0]?.trigger('click')
    await flushPromises()

    expect(store.selectedHistoryTrainingId).toBe(891)
    expect(wrapper.get('.detail-card').element).toBe(detailCard)
    expect(wrapper.get('.detail-metrics').element).toBe(detailMetrics)
    expect(wrapper.get('.question-table__row').element).toBe(firstQuestion)
    expect(wrapper.text()).toContain('오답')
    expect(wrapper.text()).toContain('문항 원본 없음')
  })

  it('제거된 CSV 저장 기능을 표시하지 않는다', async () => {
    const { wrapper } = await mountHistory(new TestTrainingRepository())

    expect(wrapper.text()).not.toContain('CSV 저장')
  })

  it('훈련 전환 중 상세와 시선 분석 외곽을 유지하고 내부 로딩 상태를 표시한다', async () => {
    const { wrapper, store } = await mountHistory(new TestTrainingRepository())
    const detailCard = wrapper.get('.detail-card').element
    const detailShell = wrapper.get('.detail-content-shell').element

    store.historyTrainingDetail = null
    store.historyDetailStatus = 'loading'
    store.historyGazeAnalysis = null
    store.historyGazeStatus = 'loading'
    await flushPromises()

    expect(wrapper.get('.detail-card').element).toBe(detailCard)
    expect(wrapper.get('.detail-content-shell').element).toBe(detailShell)
    expect(wrapper.get('.detail-content-shell').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.detail-content-shell [data-kind="loading"]').exists()).toBe(true)
    expect(wrapper.find('.history-gaze-shell').exists()).toBe(true)
    expect(wrapper.get('.history-gaze-shell').text()).toContain(
      '시선 분석 결과를 불러오는 중입니다.',
    )
  })

  it('학습자 route 변경 시 이전 선택을 비우고 새 학습자의 빈 상태를 표시한다', async () => {
    const repository = new TestTrainingRepository()
    const getCurriculumLogs = vi.spyOn(repository, 'getCurriculumLogs')
    const { wrapper, router, store } = await mountHistory(repository)

    await router.push('/teacher/students/2/training-history')
    await flushPromises()

    expect(getCurriculumLogs).toHaveBeenLastCalledWith(
      2,
      '30d',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.historyStudentId).toBe(2)
    expect(store.selectedCurriculumId).toBeNull()
    expect(store.selectedHistoryTrainingId).toBeNull()
    expect(wrapper.get('[data-test="history-empty-card"]').text()).toContain(
      '선택한 기간에 완료된 커리큘럼과 훈련이 없습니다.',
    )
    expect(wrapper.find('[data-test="history-selection-card"]').exists()).toBe(false)
    expect(wrapper.find('.statistics-card').exists()).toBe(false)
    expect(wrapper.find('.detail-card').exists()).toBe(false)
  })
})

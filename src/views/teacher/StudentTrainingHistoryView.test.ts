import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { MockTrainingRepository } from '@/features/teacher/training'
import { useTrainingStore } from '@/stores/training'
import StudentTrainingHistoryView from './StudentTrainingHistoryView.vue'

const { saveDownloadMock } = vi.hoisted(() => ({
  saveDownloadMock: vi.fn(),
}))

vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  saveDownload: saveDownloadMock,
}))

async function mountHistory(
  repository: MockTrainingRepository,
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
        stubs: {
          ChartPanel: {
            props: ['ariaLabel', 'summary', 'option'],
            computed: {
              categories() {
                return this.option.xAxis.data.join(', ')
              },
            },
            template: '<div data-test="chart">{{ ariaLabel }} {{ categories }} {{ summary }}</div>',
          },
        },
      },
    },
  )
  await flushPromises()
  return { wrapper, router, store }
}

function buttonWithText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

describe('StudentTrainingHistoryView', () => {
  it('잘못된 studentId에서는 Repository를 호출하지 않고 목록 이동 action을 표시한다', async () => {
    const repository = new MockTrainingRepository()
    const getCurriculumLogs = vi.spyOn(repository, 'getCurriculumLogs')
    const { wrapper } = await mountHistory(
      repository,
      '/teacher/students/not-a-number/training-history',
    )

    expect(getCurriculumLogs).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('올바른 학습자를 선택해 주세요.')
    expect(wrapper.text()).toContain('학습자 목록으로 이동')
  })

  it('최신 커리큘럼의 첫 실제 훈련 상세·정확도 비교·시선 집계를 표시한다', async () => {
    const { wrapper } = await mountHistory(new MockTrainingRepository())

    const selectionCard = wrapper.get('[data-test="history-selection-card"]')
    expect(selectionCard.findAll('.history-selection-section')).toHaveLength(2)
    expect(selectionCard.get('.curriculum-section').text()).toContain('완료 커리큘럼')
    expect(selectionCard.get('.training-section').text()).toContain('커리큘럼별 훈련')
    expect(selectionCard.get('.training-section').classes()).toContain('history-selection-section')

    expect(wrapper.text()).toContain('2026.07.20')
    expect(wrapper.text()).toContain('서로 다른 받침 음절 비교하기')
    expect(wrapper.text()).toContain('8분 30초')
    expect(wrapper.text()).not.toContain('학습 판단')
    expect(wrapper.text()).toContain('채점 문항2건')
    expect(wrapper.text()).toContain('정답1건')
    expect(wrapper.text()).toContain('오답1건')
    expect(wrapper.text()).toContain('문항 내용과 답안은 오답 문항에 한해 제공됩니다.')
    expect(wrapper.text()).toContain('제공되지 않음')
    expect(wrapper.text()).toContain('선택 훈련 정확도 비교')
    expect(wrapper.findAll('[data-test="chart"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="chart"]').text()).toContain(
      '현재 훈련과 이전 훈련 정확도 막대그래프',
    )
    expect(wrapper.get('[data-test="chart"]').text()).toContain('이전 훈련, 현재 훈련')
    expect(wrapper.get('[data-test="chart"]').text()).toContain('이전 훈련 정확도 70%')
    expect(wrapper.text()).not.toContain('음성 읽기 속도 추이')
    expect(wrapper.text()).not.toContain('아이 트래킹 기준')
    expect(wrapper.text()).toContain('훈련 시선 분석')
    expect(wrapper.text()).toContain('42.4초')
    expect(wrapper.text()).toContain('68회')
    expect(wrapper.text()).toContain('7회')
    expect(wrapper.text()).toContain('의학적 진단 결과가 아닙니다.')
    expect(wrapper.text()).not.toContain('읽기 이탈')
    expect(wrapper.text()).not.toContain('권장합니다')
    expect(wrapper.text()).not.toContain('generatedData')
  })

  it('훈련 gaze에서는 공식 네 집계만 표시하고 replay 상세는 표시하지 않는다', async () => {
    const repository = new MockTrainingRepository({
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
    const { wrapper, store } = await mountHistory(new MockTrainingRepository())
    const rows = wrapper.findAll('.training-row')

    await rows.find((row) => row.text().includes('비슷한 소리 고르기'))?.trigger('click')
    await flushPromises()
    expect(store.historyGazeStatus).toBe('success')
    expect(wrapper.text()).toContain('시선 분석 데이터가 없습니다.')
    expect(wrapper.get('[data-test="chart"]').text()).toContain('이전 훈련 정확도 기록 없음')

    await rows.find((row) => row.text().includes('음절 합쳐 낱말 만들기'))?.trigger('click')
    await flushPromises()
    expect(store.historyGazeStatus).toBe('success')
    expect(wrapper.text()).toContain('시선 분석을 완료하지 못했습니다.')
  })

  it('기간 변경을 서버 query용 값으로 Repository에 전달한다', async () => {
    const repository = new MockTrainingRepository()
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

  it('정확도 0을 기록 없음과 구분하고 실제 훈련 선택을 보정한다', async () => {
    const { wrapper, store } = await mountHistory(new MockTrainingRepository())
    const zeroCurriculum = wrapper
      .findAll('.curriculum-row')
      .find((row) => row.text().includes('2026.07.05'))

    await zeroCurriculum?.trigger('click')
    await flushPromises()

    expect(store.selectedCurriculumId).toBe(189)
    expect(store.selectedHistoryTrainingId).toBe(891)
    expect(zeroCurriculum?.text()).toContain('0%')
    expect(wrapper.text()).toContain('오답')
  })

  it('공통 saveDownload으로 선택 훈련 CSV를 저장한다', async () => {
    saveDownloadMock.mockClear()
    const { wrapper } = await mountHistory(new MockTrainingRepository())

    await buttonWithText(wrapper, 'CSV 저장')?.trigger('click')
    await flushPromises()

    expect(saveDownloadMock).toHaveBeenCalledWith(
      expect.objectContaining({ fileName: 'training-901-mock.csv' }),
      'training-901.csv',
    )
  })

  it('훈련 전환 중 상세와 시선 분석 외곽을 유지하고 내부 로딩 상태를 표시한다', async () => {
    const { wrapper, store } = await mountHistory(new MockTrainingRepository())
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
    expect(wrapper.get('.detail-content-shell').text()).toContain('훈련 상세를 불러오는 중입니다.')
    expect(wrapper.find('.history-gaze-shell').exists()).toBe(true)
    expect(wrapper.get('.history-gaze-shell').text()).toContain(
      '시선 분석 결과를 불러오는 중입니다.',
    )
  })

  it('학습자 route 변경 시 이전 선택을 비우고 새 학습자의 빈 상태를 표시한다', async () => {
    const repository = new MockTrainingRepository()
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

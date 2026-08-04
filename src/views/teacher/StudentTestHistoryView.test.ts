import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import type { TestRepository } from '@/features/teacher/test'
import { testDetailFixtures } from '@/test/fixtures/test'
import { TestTestRepository } from '@/test/repositories'
import { testGazeFixtures } from '@/test/fixtures/gaze'
import { useTestStore } from '@/stores/test'
import StudentTestHistoryView from './StudentTestHistoryView.vue'

async function mountHistory(
  repository: TestRepository,
  initialPath = '/teacher/students/1/test-history',
) {
  const pinia = createPinia()
  const store = useTestStore(pinia)
  store.setRepository(repository)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/teacher/students', name: 'teacher-students', component: { template: '<div />' } },
      {
        path: '/teacher/students/:id/test-history',
        name: 'student-test-history',
        component: StudentTestHistoryView,
      },
      {
        path: '/teacher/students/:id/curriculum',
        name: 'student-curriculum',
        component: { template: '<div>커리큘럼 화면</div>' },
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
            props: {
              ariaLabel: String,
              option: Object,
              animated: Boolean,
            },
            computed: {
              seriesNames() {
                return this.option.series.map((series: { name: string }) => series.name).join(', ')
              },
              seriesTypes() {
                return this.option.series.map((series: { type: string }) => series.type).join(', ')
              },
            },
            template:
              '<div data-test="metric-chart">{{ ariaLabel }} {{ seriesNames }} {{ seriesTypes }} {{ animated }}</div>',
          },
        },
      },
    },
  )
  await flushPromises()
  return { wrapper, router, store }
}

describe('StudentTestHistoryView', () => {
  it('잘못된 studentId에서는 Repository를 호출하지 않는다', async () => {
    const repository = new TestTestRepository()
    const getTests = vi.spyOn(repository, 'getTests')
    const { wrapper } = await mountHistory(
      repository,
      '/teacher/students/not-a-number/test-history',
    )

    expect(getTests).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('올바른 학습자를 선택해 주세요.')
  })

  it('검사 커리큘럼 한 건에 3개 영역과 실제 9문항 제출 결과를 표시한다', async () => {
    const { wrapper, store } = await mountHistory(new TestTestRepository())

    expect(store.currentTestCurriculumId).toBe('1011')
    expect(wrapper.text()).toContain('실력 도전 #1011')
    expect(wrapper.text()).toContain('영역별 점수')
    expect(wrapper.text()).toContain('음운 인식')
    expect(wrapper.text()).toContain('짧은 글')
    expect(wrapper.text()).toContain('유창성')
    expect(wrapper.findAll('.question-list > li')).toHaveLength(9)
    expect(wrapper.text()).toContain('제출 답안')
    expect(wrapper.text()).toContain('발음 점수')
    expect(wrapper.text()).toContain('AI 콘텐츠 생성 완료')
    expect(wrapper.text()).toContain('최종 검수 필요')
    expect(wrapper.text()).toContain('최근 추천 시도')
    expect(wrapper.text()).toContain('재시도 횟수')
    expect(wrapper.text()).toContain('9문항 확인')
  })

  it('문항 testId로 실제 시선 집계를 조회하고 raw replay는 표시하지 않는다', async () => {
    const repository = new TestTestRepository()
    const getGazeAnalysis = vi.spyOn(repository, 'getGazeAnalysis')
    const { wrapper } = await mountHistory(repository)

    expect(getGazeAnalysis).toHaveBeenCalledTimes(9)
    expect(getGazeAnalysis.mock.calls.map((call) => call[1])).toContain('10111')
    expect(wrapper.findAll('.question-list button')).toHaveLength(1)
    expect(wrapper.text()).toContain('이 검사 구간의 시선 분석 보기')
    expect(wrapper.text()).not.toContain('문항 1 시선 분석')

    await wrapper.get('.question-list button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('문항 1 시선 분석')
    expect(wrapper.text()).toContain('총 시선 체류 시간')
    expect(wrapper.text()).not.toContain('단어별 시선 머무름')
  })

  it('같은 testId로 펼쳐진 세 문항 중 첫 문항에만 버튼을 표시하고 하나만 선택한다', async () => {
    const source = testDetailFixtures.find((detail) => detail.testCurriculumId === '1011')!
    const legacy = {
      ...source,
      questions: source.questions.map((question, index) => ({
        ...question,
        testId: String(3001 + Math.floor(index / 3)),
      })),
    }
    const repository = new TestTestRepository({
      details: testDetailFixtures.map((detail) =>
        detail.testCurriculumId === legacy.testCurriculumId ? legacy : detail,
      ),
      gazeByTestId: {
        '3001': testGazeFixtures[1_011]!,
        '3002': { status: 'NO_DATA', analysis: null },
        '3003': { status: 'NO_DATA', analysis: null },
      },
    })
    const { wrapper } = await mountHistory(repository)

    expect(wrapper.findAll('.question-list button')).toHaveLength(1)
    expect(wrapper.findAll('.question-list > li').at(0)?.find('button').exists()).toBe(true)
    expect(wrapper.findAll('.question-list > li').at(1)?.find('button').exists()).toBe(false)
    expect(wrapper.findAll('.question-list > li').at(2)?.find('button').exists()).toBe(false)

    await wrapper.get('.question-list button').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('.question-list > li.is-gaze-selected')).toHaveLength(1)
    expect(wrapper.findAll('.question-list > li').at(0)?.classes()).toContain('is-gaze-selected')
  })

  it('전체 점수·풀이 시간·시선 이탈·발음 점수를 검사 단위로 비교한다', async () => {
    const { wrapper } = await mountHistory(new TestTestRepository())

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('전체 점수')
    expect(wrapper.text()).toContain('문제 풀이 시간')
    expect(wrapper.text()).toContain('시선 이탈 횟수')
    expect(wrapper.text()).toContain('발음 점수')
    expect(wrapper.findAll('[data-test="metric-chart"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="metric-chart"]').text()).toContain('bar, line')
    expect(wrapper.get('[data-test="metric-chart"]').text()).toContain('true')
    expect(wrapper.findAll('[data-metric-key="overallScore"].highlighted')).toHaveLength(
      wrapper.findAll('.detail-card').length,
    )

    await wrapper.get<HTMLSelectElement>('#comparison-test').setValue('1008')
    await flushPromises()
    expect(wrapper.findAll('.detail-card')).toHaveLength(2)
    expect(wrapper.text()).toContain('비교 1/2건')
  })

  it('추천 커리큘럼 ID를 보존해 해당 검수 화면으로 이동한다', async () => {
    const { wrapper, router } = await mountHistory(new TestTestRepository())

    expect(wrapper.text()).toContain('추천 커리큘럼 #201')
    const button = wrapper
      .findAll('button')
      .find((item) => item.text().includes('추천 교안 검수하기'))
    await button?.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.name).toBe('student-curriculum')
    expect(router.currentRoute.value.params.id).toBe('1')
    expect(router.currentRoute.value.query.curriculumId).toBe('201')
  })

  it('실제 0점·0초·0회를 측정값 없음과 구분한다', async () => {
    const { wrapper } = await mountHistory(new TestTestRepository())

    await wrapper.get<HTMLSelectElement>('#current-test').setValue('1004')
    await flushPromises()

    expect(wrapper.text()).toContain('0점')
    expect(wrapper.text()).toContain('0초')
    expect(wrapper.text()).toContain('0회')
  })

  it('학습자 변경 시 검사 없음 상태를 표시한다', async () => {
    const { wrapper, router, store } = await mountHistory(new TestTestRepository())

    await router.push('/teacher/students/3/test-history')
    await flushPromises()

    expect(store.currentTestCurriculumId).toBeNull()
    expect(wrapper.text()).toContain('완료된 실력 도전 검사가 없습니다.')
  })

  it('403 오류에서 고정 결과 대신 권한 안내를 표시한다', async () => {
    const { wrapper } = await mountHistory(new TestTestRepository({ forbiddenStudentIds: [1] }))

    expect(wrapper.text()).toContain('이 학습자의 검사 기록을 볼 권한이 없습니다.')
    expect(wrapper.find('.question-list').exists()).toBe(false)
  })
})

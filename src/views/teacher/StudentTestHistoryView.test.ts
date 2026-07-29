import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { MockTestRepository, type TestRepository } from '@/features/teacher/test'
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
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>학습자 목록</div>' },
      },
      {
        path: '/teacher/students/:id/test-history',
        name: 'student-test-history',
        component: StudentTestHistoryView,
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
            props: ['ariaLabel', 'option'],
            computed: {
              seriesNames() {
                return this.option.series.map((series: { name: string }) => series.name).join(', ')
              },
            },
            template: '<div data-test="area-chart">{{ ariaLabel }} {{ seriesNames }}</div>',
          },
        },
      },
    },
  )
  await flushPromises()
  return { wrapper, router, store }
}

describe('StudentTestHistoryView', () => {
  it('잘못된 studentId에서는 Repository를 호출하지 않고 목록 이동 action을 표시한다', async () => {
    const repository = new MockTestRepository()
    const getTests = vi.spyOn(repository, 'getTests')
    const { wrapper } = await mountHistory(
      repository,
      '/teacher/students/not-a-number/test-history',
    )

    expect(getTests).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('올바른 학습자를 선택해 주세요.')
    expect(wrapper.text()).toContain('학습자 목록으로 이동')
  })

  it('최신 검사 한 건의 상세와 시선 집계를 표시하고 임의 지표는 표시하지 않는다', async () => {
    const { wrapper, store } = await mountHistory(new MockTestRepository())

    expect(store.currentTestId).toBe(1_011)
    expect(store.comparisonTestIds).toEqual([])
    expect(wrapper.text()).toContain('84점')
    expect(wrapper.text()).toContain('이전 검사 대비 +8점')
    expect(wrapper.text()).toContain('문장 의미 연결 2단계')
    expect(wrapper.text()).toContain('1분 32초')
    expect(wrapper.text()).toContain('친구를 배려하는 마음')
    expect(wrapper.findAll('[data-test="area-chart"]')).toHaveLength(1)
    expect(wrapper.text()).not.toContain('전체 검사 추이')
    expect(wrapper.text()).toContain('검사 평균')
    expect(wrapper.find('input[type="date"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('검사 시선 분석')
    expect(wrapper.text().indexOf('검사별 주요 기록')).toBeLessThan(
      wrapper.text().indexOf('검사 시선 분석'),
    )
    expect(wrapper.text()).toContain('51.2초')
    expect(wrapper.text()).toContain('82회')
    expect(wrapper.text()).toContain('9회')
    expect(wrapper.text()).not.toContain('시선 고정')
    expect(wrapper.text()).not.toContain('읽기 이탈')
  })

  it('전체 검사 상세 일부가 실패하면 성공한 평균을 유지하고 재시도를 제공한다', async () => {
    const mock = new MockTestRepository()
    const compareTests = vi
      .spyOn(mock, 'compareTests')
      .mockImplementation(async (studentId, currentTestId, comparisonTestIds, options) => {
        if (currentTestId === 1_005) throw new Error('temporary failure')
        return new MockTestRepository().compareTests(
          studentId,
          currentTestId,
          comparisonTestIds,
          options,
        )
      })
    const { wrapper, store } = await mountHistory(mock)

    expect(compareTests).toHaveBeenCalled()
    expect(store.trendStatus).toBe('success')
    expect(store.trendDetails.map((detail) => detail.testId)).toEqual([1_004, 1_008, 1_011])
    expect(wrapper.text()).toContain('일부 검사 1건을 불러오지 못해')
    expect(wrapper.text()).toContain('다시 확인')
  })

  it('검사 선택에 따라 NO_DATA와 FAILED를 요청 오류 없이 구분한다', async () => {
    const { wrapper, store } = await mountHistory(new MockTestRepository())

    await wrapper.get<HTMLSelectElement>('#current-test').setValue('1008')
    await flushPromises()
    expect(store.gazeStatus).toBe('success')
    expect(wrapper.text()).toContain('시선 분석 데이터가 없습니다.')

    await wrapper.get<HTMLSelectElement>('#current-test').setValue('1005')
    await flushPromises()
    expect(store.gazeStatus).toBe('success')
    expect(wrapper.text()).toContain('시선 분석을 완료하지 못했습니다.')
  })

  it('실제 완료 검사에서 비교 두 건만 추가하고 세 번째 선택을 차단한다', async () => {
    const { wrapper, store } = await mountHistory(new MockTestRepository())
    const comparisonSelect = wrapper.get<HTMLSelectElement>('#comparison-test')

    await comparisonSelect.setValue('1008')
    await flushPromises()
    await wrapper.get<HTMLSelectElement>('#comparison-test').setValue('1005')
    await flushPromises()

    expect(store.comparisonTestIds).toEqual([1_008, 1_005])
    expect(store.comparisonResult?.comparisonTests.map((test) => test.testId)).toEqual([
      1_008, 1_005,
    ])
    expect(wrapper.get('#comparison-test').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('비교 2/2건')
    expect(wrapper.findAll('.detail-card')).toHaveLength(3)
  })

  it('선택한 비교 검사를 개별 해제한다', async () => {
    const { wrapper, store } = await mountHistory(new MockTestRepository())
    await wrapper.get<HTMLSelectElement>('#comparison-test').setValue('1008')
    await flushPromises()

    const removeButton = wrapper
      .findAll('button')
      .find((button) => button.attributes('aria-label')?.includes('비교 해제'))
    await removeButton?.trigger('click')
    await flushPromises()

    expect(store.comparisonTestIds).toEqual([])
    expect(wrapper.findAll('.comparison-chip')).toHaveLength(0)
    expect(wrapper.text()).toContain('비교 0/2건')
  })

  it('서버의 0점·0초·0%를 결측값과 구분한다', async () => {
    const { wrapper } = await mountHistory(new MockTestRepository())

    await wrapper.get<HTMLSelectElement>('#current-test').setValue('1004')
    await flushPromises()

    expect(wrapper.text()).toContain('0점')
    expect(wrapper.text()).toContain('0초')
    expect(wrapper.text()).toContain('0%')
    expect(wrapper.text()).toContain('이전 검사와 동일')
  })

  it('학습자 route 변경 시 목록과 선택을 초기화하고 검사 없음 상태를 표시한다', async () => {
    const repository = new MockTestRepository()
    const getTests = vi.spyOn(repository, 'getTests')
    const { wrapper, router, store } = await mountHistory(repository)

    await router.push('/teacher/students/3/test-history')
    await flushPromises()

    expect(getTests).toHaveBeenLastCalledWith(
      3,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(store.studentId).toBe(3)
    expect(store.currentTestId).toBeNull()
    expect(store.comparisonTestIds).toEqual([])
    expect(wrapper.text()).toContain('완료된 검사가 없습니다.')
  })

  it('403 오류에서 고정 검사 결과 대신 권한 안내를 표시한다', async () => {
    const { wrapper } = await mountHistory(new MockTestRepository({ forbiddenStudentIds: [1] }))

    expect(wrapper.text()).toContain('이 학습자의 검사 기록을 볼 권한이 없습니다.')
    expect(wrapper.text()).toContain('학습자 목록으로 이동')
    expect(wrapper.text()).not.toContain('84점')
  })
})

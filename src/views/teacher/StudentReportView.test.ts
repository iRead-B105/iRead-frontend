import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { MockReportRepository } from '@/features/teacher/report'
import { MockStudentRepository } from '@/features/teacher/student'
import { useReportStore } from '@/stores/report'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'
import StudentReportView from './StudentReportView.vue'

async function mountReport(
  initialPath = '/teacher/students/1/report',
  reportRepository = new MockReportRepository({
    delayMs: 0,
    now: () => new Date('2026-07-28T10:00:00+09:00'),
  }),
) {
  const pinia = createPinia()
  useReportStore(pinia).setRepository(reportRepository)
  useStudentStore(pinia).setRepository(new MockStudentRepository())
  useSessionStore(pinia).initialize({
    email: 'teacher@example.com',
    name: '이선생',
    organization: 'iRead 학습센터',
    gender: 'FEMALE',
    profileImageUrl: null,
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>학습자 목록</div>' },
      },
      {
        path: '/teacher/students/:id/report',
        name: 'student-report',
        component: StudentReportView,
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
          ReportPreview: { template: '<div data-test="report-preview"><slot /></div>' },
          ChartPanel: {
            props: ['ariaLabel'],
            template: '<div data-test="chart">{{ ariaLabel }}</div>',
          },
        },
      },
    },
  )
  await flushPromises()
  return { wrapper, router, pinia, reportRepository }
}

function buttonWithText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

describe('StudentReportView', () => {
  it('잘못된 studentId에서는 보고서 Repository를 호출하지 않는다', async () => {
    const repository = new MockReportRepository({ delayMs: 0 })
    const listByStudent = vi.spyOn(repository, 'listByStudent')
    const { wrapper } = await mountReport('/teacher/students/not-a-number/report', repository)

    expect(listByStudent).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('올바른 학습자를 선택해 주세요.')
    expect(wrapper.text()).toContain('학습자 목록으로 이동')
  })

  it('저장 보고서를 생성일과 기간만으로 표시한다', async () => {
    const { wrapper } = await mountReport()

    expect(wrapper.text()).toContain('저장된 보고서')
    expect(wrapper.text()).toContain('2026.07.27')
    expect(wrapper.text()).toContain('2026.07.01')
    expect(wrapper.text()).not.toContain('초안')
    expect(wrapper.text()).not.toContain('발행 완료')
    expect(wrapper.text()).not.toContain('버전')
    expect(wrapper.text()).not.toContain('교수자 의견 (선택)')
    expect(wrapper.find('[aria-label="교수자 의견"]').exists()).toBe(false)
  })

  it('선택한 상세가 snapshot과 현재 교수자 정보만 표시한다', async () => {
    const { wrapper } = await mountReport()

    await wrapper.get('.saved-report-row').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('김하늘 학습 보고서')
    expect(wrapper.text()).toContain('이선생')
    expect(wrapper.text()).toContain('학습 요약')
    expect(wrapper.text()).toContain('기간별 성장 기록')
    expect(wrapper.text()).toContain('훈련 시선 추이')
    expect(wrapper.text()).toContain('검사 시선 추이')
    expect(wrapper.text()).toContain('교수자 의견')
    expect(wrapper.find('[aria-label="교수자 의견"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('변화를 비교하려면 두 건 이상의 결과가 필요합니다.')
    expect(wrapper.text()).not.toContain('내부 메모에서 불러오기')
    expect(wrapper.text()).not.toContain('학습 판단')
    expect(wrapper.text()).not.toContain('보고서 버전')
  })

  it('완료 학습이 없는 기간은 입력을 유지하고 빈 보고서를 만들지 않는다', async () => {
    const { wrapper, pinia } = await mountReport('/teacher/students/3/report')
    const store = useReportStore(pinia)
    const inputs = wrapper.findAll('input[type="date"]')
    await inputs[0]!.setValue('2026-07-01')
    await inputs[1]!.setValue('2026-07-28')

    await buttonWithText(wrapper, '보고서 생성')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('선택한 기간에 완료된 학습 기록이 없습니다.')
    expect(store.startDate).toBe('2026-07-01')
    expect(store.endDate).toBe('2026-07-28')
    expect(store.selectedReport).toBeNull()
  })

  it('생성 버튼 중복 제출을 막고 POST 후 상세을 표시한다', async () => {
    const repository = new MockReportRepository({
      delayMs: 0,
      now: () => new Date('2026-07-28T10:00:00+09:00'),
    })
    const create = vi.spyOn(repository, 'create')
    const get = vi.spyOn(repository, 'get')
    const { wrapper, pinia } = await mountReport('/teacher/students/1/report', repository)
    const inputs = wrapper.findAll('input[type="date"]')
    await inputs[0]!.setValue('2026-07-03')
    await inputs[1]!.setValue('2026-07-24')

    await buttonWithText(wrapper, '보고서 생성')?.trigger('click')
    await flushPromises()

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      studentId: 1,
      startDate: '2026-07-03',
      endDate: '2026-07-24',
    })
    expect(get).toHaveBeenCalledWith(
      useReportStore(pinia).selectedReportId,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(wrapper.text()).toContain('김하늘 학습 보고서')
  })
})

import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import { reportFixtures } from '@/test/fixtures/report'
import { TestReportRepository, TestStudentRepository } from '@/test/repositories'
import { useReportStore } from '@/stores/report'
import { useSessionStore } from '@/stores/session'
import { useStudentStore } from '@/stores/students'
import StudentReportView from './StudentReportView.vue'

async function mountReport(
  initialPath = '/teacher/students/1/report',
  reportRepository = new TestReportRepository({
    delayMs: 0,
    now: () => new Date('2026-07-28T10:00:00+09:00'),
  }),
) {
  const pinia = createPinia()
  useReportStore(pinia).setRepository(reportRepository)
  useStudentStore(pinia).setRepository(new TestStudentRepository())
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
    const repository = new TestReportRepository({ delayMs: 0 })
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

  it('저장된 보고서를 6개씩 나누고 페이지를 이동한다', async () => {
    const baseReport = reportFixtures[0]!
    const reports = Array.from({ length: 7 }, (_, index) => ({
      ...baseReport,
      reportId: 9_000 + index,
      createdAt: `2026-07-${String(20 - index).padStart(2, '0')}T09:00:00+09:00`,
    }))
    const { wrapper } = await mountReport(
      '/teacher/students/1/report',
      new TestReportRepository({ reports, delayMs: 0 }),
    )

    expect(wrapper.findAll('.saved-report-row')).toHaveLength(6)
    expect(wrapper.get('.saved-reports__pagination').text()).toContain('1 / 2')

    await wrapper.get('[aria-label="다음 보고서 페이지"]').trigger('click')

    expect(wrapper.findAll('.saved-report-row')).toHaveLength(1)
    expect(wrapper.get('.saved-reports__pagination').text()).toContain('2 / 2')
    expect(wrapper.get('[aria-label="다음 보고서 페이지"]').attributes('disabled')).toBeDefined()
  })

  it('선택한 상세가 snapshot과 현재 교수자 정보만 표시한다', async () => {
    const { wrapper, pinia } = await mountReport()

    await wrapper.get('.saved-report-row').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('김하늘 학습 보고서')
    expect(wrapper.text()).toContain('이선생')
    expect(wrapper.text()).toContain('학습 참여 요약')
    expect(wrapper.text()).toContain('핵심 성과 요약')
    expect(wrapper.text()).toContain('기간별 성장 추이')
    expect(wrapper.text()).toContain('커리큘럼 영역별 성취도')
    expect(wrapper.text()).toContain('자주 틀린 단어와 오답률')
    expect(wrapper.text()).toContain('훈련 시선 추이')
    expect(wrapper.text()).toContain('검사 시선 추이')
    expect(wrapper.text()).toContain('교수자 의견')
    expect(wrapper.text()).toContain('완료된 학습 데이터를 기준으로 생성된 보고서입니다.')
    expect(wrapper.find('[aria-label="교수자 의견"]').exists()).toBe(true)
    expect((wrapper.get('[aria-label="교수자 의견"]').element as HTMLTextAreaElement).value).toBe(
      useReportStore(pinia).teacherMemoDraft,
    )
    expect(wrapper.text()).toContain('변화를 비교하려면 두 건 이상의 결과가 필요합니다.')
    expect(wrapper.text()).not.toContain('내부 메모에서 불러오기')
    expect(wrapper.text()).not.toContain('학습 판단')
    expect(wrapper.text()).not.toContain('보고서 버전')
  })

  it('교수자 의견 입력값과 Store draft를 같은 값으로 유지한다', async () => {
    const { wrapper, pinia } = await mountReport()
    await wrapper.get('.saved-report-row').trigger('click')
    await flushPromises()

    const textarea = wrapper.get('[aria-label="교수자 의견"]')
    await textarea.setValue('새로 작성한 교수자 의견')

    expect(useReportStore(pinia).teacherMemoDraft).toBe('새로 작성한 교수자 의견')
    expect(buttonWithText(wrapper, '의견 저장')?.attributes('disabled')).toBeUndefined()
  })

  it('보고서 필터의 역전·미래 기간과 의견 제어문자를 즉시 거부한다', async () => {
    const { wrapper } = await mountReport()
    const from = wrapper.get<HTMLInputElement>('[aria-label="보고서 기간 시작일"]')
    const to = wrapper.get<HTMLInputElement>('[aria-label="보고서 기간 종료일"]')
    await from.setValue('2026-07-29')
    await to.setValue('2026-07-20')

    expect(wrapper.text()).toContain('종료일은 시작일과 같거나 이후여야 합니다.')
    expect(buttonWithText(wrapper, '조회')?.attributes('disabled')).toBeDefined()

    await wrapper.get('.saved-report-row').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="교수자 의견"]').setValue('의견\u0000')
    expect(wrapper.text()).toContain('제어 문자')
    expect(buttonWithText(wrapper, '의견 저장')?.attributes('disabled')).toBeDefined()
  })

  it('완료 학습이 없는 기간은 입력을 유지하고 빈 보고서를 만들지 않는다', async () => {
    const repository = new TestReportRepository({ delayMs: 0 })
    const create = vi.spyOn(repository, 'create')
    const { wrapper, pinia } = await mountReport('/teacher/students/3/report', repository)
    const store = useReportStore(pinia)
    store.startDate = '2026-07-01'
    store.endDate = '2026-07-28'
    await flushPromises()

    const generateButton = buttonWithText(wrapper, '보고서 생성')

    expect(generateButton?.attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('완료 학습일이 1일 이상 필요합니다.')
    expect(create).not.toHaveBeenCalled()
    expect(store.startDate).toBe('2026-07-01')
    expect(store.endDate).toBe('2026-07-28')
    expect(store.selectedReport).toBeNull()
  })

  it('완료 학습일이 하루인 기간에도 보고서를 생성한다', async () => {
    const repository = new TestReportRepository({
      delayMs: 0,
      now: () => new Date('2026-07-28T10:00:00+09:00'),
      completedLearningDatesByStudent: { 1: ['2026-07-05'] },
    })
    const create = vi.spyOn(repository, 'create')
    const { wrapper, pinia } = await mountReport('/teacher/students/1/report', repository)
    const store = useReportStore(pinia)
    store.startDate = '2026-07-05'
    store.endDate = '2026-07-05'
    await flushPromises()

    const generateButton = buttonWithText(wrapper, '보고서 생성')
    expect(generateButton?.attributes('disabled')).toBeUndefined()

    await generateButton?.trigger('click')
    await flushPromises()

    expect(create).toHaveBeenCalledWith({
      studentId: 1,
      startDate: '2026-07-05',
      endDate: '2026-07-05',
    })
    expect(store.selectedReport?.snapshot.learningDays).toBeGreaterThanOrEqual(1)
    expect(wrapper.text()).toContain('김하늘 학습 보고서')
  })

  it('생성 버튼 중복 제출을 막고 POST 후 상세을 표시한다', async () => {
    const repository = new TestReportRepository({
      delayMs: 0,
      now: () => new Date('2026-07-28T10:00:00+09:00'),
    })
    const create = vi.spyOn(repository, 'create')
    const get = vi.spyOn(repository, 'get')
    const { wrapper, pinia } = await mountReport('/teacher/students/1/report', repository)
    const store = useReportStore(pinia)
    store.startDate = '2026-07-03'
    store.endDate = '2026-07-24'
    await flushPromises()

    await buttonWithText(wrapper, '보고서 생성')?.trigger('click')
    await flushPromises()

    expect(create).toHaveBeenCalledTimes(1)
    expect(create).toHaveBeenCalledWith({
      studentId: 1,
      startDate: '2026-07-03',
      endDate: '2026-07-24',
    })
    expect(get).toHaveBeenCalledWith(
      store.selectedReportId,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(wrapper.text()).toContain('김하늘 학습 보고서')
  })
})

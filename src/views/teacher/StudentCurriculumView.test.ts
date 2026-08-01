import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it, vi } from 'vitest'
import {
  currentCurriculumFixture,
  trainingCatalogFixture,
  trainingDetailFixtures,
  type DailyCurriculum,
  type TrainingRepository,
} from '@/features/teacher/training'
import { ApiError } from '@/lib/api'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import LessonMaterialEditor from '@/components/teacher/LessonMaterialEditor.vue'
import { useTrainingStore } from '@/stores/training'
import StudentCurriculumView from './StudentCurriculumView.vue'

function repository(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    getCatalog: vi.fn().mockResolvedValue(trainingCatalogFixture),
    getCurrentCurriculum: vi.fn().mockResolvedValue(currentCurriculumFixture),
    createCurriculum: vi.fn(),
    getCurriculum: vi.fn(),
    updateCurriculum: vi.fn().mockResolvedValue(currentCurriculumFixture),
    completeCurriculumReview: vi.fn(),
    generateTraining: vi.fn().mockResolvedValue({ questions: [] }),
    getTrainingDetail: vi.fn().mockResolvedValue(trainingDetailFixtures[0]),
    getLessonMaterial: vi.fn().mockResolvedValue(undefined as never),
    saveLessonMaterial: vi.fn().mockResolvedValue(undefined as never),
    getCurriculumLogs: vi.fn().mockResolvedValue([]),
    getTrainingLog: vi.fn(),
    getStatistics: vi.fn(),
    getGazeAnalysis: vi.fn().mockResolvedValue({ status: 'NO_DATA', analysis: null }),
    exportTraining: vi.fn(),
    ...overrides,
  }
}

async function mountCurriculum(
  trainingRepository: TrainingRepository,
  initialPath = '/teacher/students/1/curriculum',
) {
  const pinia = createPinia()
  const store = useTrainingStore(pinia)
  store.setRepository(trainingRepository)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: '/teacher/students',
        name: 'teacher-students',
        component: { template: '<div>학습자 목록</div>' },
      },
      {
        path: '/teacher/students/:id/curriculum',
        name: 'student-curriculum',
        component: StudentCurriculumView,
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
          teleport: true,
          Dialog: { template: '<div><slot /></div>' },
          DialogContent: { template: '<section><slot /></section>' },
          DialogDescription: { template: '<p><slot /></p>' },
          DialogTitle: { template: '<div><slot /></div>' },
        },
      },
      attachTo: document.body,
    },
  )
  await flushPromises()
  return { wrapper, router, store }
}

function buttonWithText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((button) => button.text().includes(text))
}

function mockRect(top: number, bottom: number): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    bottom,
    left: 0,
    right: 400,
    width: 400,
    height: bottom - top,
    toJSON: () => ({}),
  }
}

function dispatchPointerEvent(
  element: Element,
  type: string,
  init: {
    button?: number
    clientX?: number
    clientY: number
    pointerId: number
  },
): void {
  const event = new Event(type, { bubbles: true, cancelable: true })
  for (const [key, value] of Object.entries(init)) {
    Object.defineProperty(event, key, { value })
  }
  element.dispatchEvent(event)
}

describe('StudentCurriculumView', () => {
  it('잘못된 studentId에서는 API를 호출하지 않고 목록 이동 action을 표시한다', async () => {
    const trainingRepository = repository()
    const { wrapper } = await mountCurriculum(
      trainingRepository,
      '/teacher/students/not-a-number/curriculum',
    )

    expect(trainingRepository.getCatalog).not.toHaveBeenCalled()
    expect(trainingRepository.getCurrentCurriculum).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('올바른 학습자를 선택해 주세요.')
    expect(wrapper.text()).toContain('학습자 목록으로 이동')
  })

  it('차회가 없으면 빈 draft에서 첫 저장을 POST로 생성한다', async () => {
    const created: DailyCurriculum = {
      curriculumId: 301,
      status: 'NOT_STARTED',
      trainings: Array.from({ length: 5 }, (_, index) => ({
        trainingId: 1001 + index,
        trainingTemplateId: 1,
        sequence: index + 1,
        unitName: '글자 따라 보기',
        trainingName: '모음 따라 보기',
        status: 'NOT_READY' as const,
      })),
    }
    const createCurriculum = vi.fn().mockResolvedValue(created)
    const trainingRepository = repository({
      getCurrentCurriculum: vi.fn().mockResolvedValue(null),
      createCurriculum,
    })
    const { wrapper } = await mountCurriculum(trainingRepository)

    expect(wrapper.text()).toContain('저장된 다음 회차가 없습니다.')
    for (let index = 0; index < 5; index += 1) {
      await buttonWithText(wrapper, '다음 회차에 1회 추가')?.trigger('click')
      await flushPromises()
    }
    await buttonWithText(wrapper, '커리큘럼 생성')?.trigger('click')
    await flushPromises()

    expect(createCurriculum).toHaveBeenCalledWith(1, {
      trainingTemplateIds: [1, 1, 1, 1, 1],
    })
    expect(wrapper.text()).toContain('5회 시행')
  })

  it('실제 training ID가 있는 반복 시행에서만 교안 편집을 연다', async () => {
    const getLessonMaterial = vi.fn().mockResolvedValue(undefined as never)
    const { wrapper } = await mountCurriculum(repository({ getLessonMaterial }))

    const editorButtons = wrapper
      .findAll('button')
      .filter((button) => button.text().includes('교안 편집'))
    expect(editorButtons).toHaveLength(3)
    await editorButtons[1]?.trigger('click')
    await flushPromises()

    expect(getLessonMaterial).toHaveBeenCalledWith(
      1,
      102,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(wrapper.text()).toContain('서로 다른 받침 음절 비교하기 2/2회차')
    expect(wrapper.text()).toContain('읽기 전용')
    expect(wrapper.text()).not.toContain('자료 추가')
    expect(wrapper.text()).not.toContain('훈련 기본 정보')

    const editor = wrapper.findComponent(LessonMaterialEditor)
    expect(editor.exists()).toBe(true)
    editor.vm.$emit('update:open', false)
    await flushPromises()
    expect(wrapper.findComponent(LessonMaterialEditor).exists()).toBe(false)
  })

  it('성취도 null을 0%가 아니라 미수행 평가 기록 없음으로 표시한다', async () => {
    const { wrapper } = await mountCurriculum(repository())

    expect(wrapper.text()).toContain('34개 훈련')
    expect(wrapper.text()).toContain('미수행(평가 기록 없음)')
    expect(wrapper.text()).not.toContain('모음 따라 보기0%')
  })

  it('전체와 영역별 탭으로 34개 목록을 원래 순서 그대로 필터링한다', async () => {
    const { wrapper, store } = await mountCurriculum(repository())

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0]?.text()).toContain('전체')
    expect(tabs[0]?.text()).toContain('34')
    expect(tabs[0]?.attributes('aria-selected')).toBe('true')
    expect(wrapper.findAll('.curriculum-row')).toHaveLength(34)
    expect(store.catalog.map((item) => item.trainingTemplateId)).toEqual(
      trainingCatalogFixture.map((item) => item.trainingTemplateId),
    )

    await buttonWithText(wrapper, '글자 만들기')?.trigger('click')
    await flushPromises()

    const filteredRows = wrapper.findAll('.curriculum-row')
    expect(filteredRows).toHaveLength(5)
    expect(filteredRows.map((row) => row.find('.unit-label').text())).toEqual(
      Array.from({ length: 5 }, () => '글자 만들기'),
    )
    expect(filteredRows.map((row) => row.find('b').text())).toEqual(['14', '15', '16', '17', '18'])
    expect(wrapper.get('[role="tabpanel"]').attributes('aria-labelledby')).toBe(
      wrapper.find('[role="tab"][aria-selected="true"]').attributes('id'),
    )
  })

  it('커리큘럼이 시작 전이면 개별 훈련 상태가 섞여 있어도 편집을 허용한다', async () => {
    const { wrapper } = await mountCurriculum(repository())

    expect(
      new Set(currentCurriculumFixture.trainings.map((training) => training.status)).size,
    ).toBe(2)
    expect(wrapper.findAll('.recommendation-list article.editable')).toHaveLength(
      currentCurriculumFixture.trainings.length,
    )
    expect(wrapper.findAll('.remove-button')).toHaveLength(
      currentCurriculumFixture.trainings.length,
    )
    expect(wrapper.find('.curriculum-feedback').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('순서 편집')
    expect(
      wrapper.findAll('button').filter((button) => button.text() === '변경 사항 저장'),
    ).toHaveLength(1)
  })

  it('재동기화 필요 상태에서는 편집을 잠그고 GET 재시도 action을 제공한다', async () => {
    const getCurrentCurriculum = vi.fn().mockResolvedValue(currentCurriculumFixture)
    const trainingRepository = repository({ getCurrentCurriculum })
    const { wrapper, store } = await mountCurriculum(trainingRepository)

    store.curriculumSynchronizationStatus = 'required'
    store.curriculumError =
      '커리큘럼은 저장됐지만 최신 내용을 불러오지 못했습니다. 최신 내용을 다시 불러와 주세요.'
    await flushPromises()

    expect(wrapper.text()).toContain('저장은 완료됐지만 최신 커리큘럼 확인이 필요합니다.')
    expect(wrapper.find('.curriculum-feedback').exists()).toBe(true)
    expect(buttonWithText(wrapper, '변경 사항 저장')?.attributes('disabled')).toBeDefined()
    expect(buttonWithText(wrapper, '교안 편집')?.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.recommendation-list article.editable').exists()).toBe(false)

    await buttonWithText(wrapper, '최신 내용 다시 불러오기')?.trigger('click')
    await flushPromises()

    expect(getCurrentCurriculum).toHaveBeenCalledTimes(2)
    expect(store.curriculumSynchronizationStatus).toBe('synced')
    expect(wrapper.find('.curriculum-feedback').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('최신 커리큘럼 확인이 필요합니다.')
  })

  it('409 충돌을 저장 성공으로 표시하지 않고 서버 최신 상태 복구 action을 제공한다', async () => {
    const getCurrentCurriculum = vi.fn().mockResolvedValue(currentCurriculumFixture)
    const updateCurriculum = vi.fn().mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'CURRICULUM_ALREADY_STARTED',
        message: 'conflict',
      }),
    )
    const { wrapper, store } = await mountCurriculum(
      repository({ getCurrentCurriculum, updateCurriculum }),
    )
    store.selectTemplate(14)
    store.addSelectedTemplate()
    store.selectTemplate(15)
    store.addSelectedTemplate()
    await flushPromises()

    await buttonWithText(wrapper, '변경 사항 저장')?.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('커리큘럼 저장 요청이 서버 상태와 충돌했습니다.')
    expect(wrapper.text()).not.toContain('커리큘럼 변경 사항이 저장되었습니다.')
    expect(buttonWithText(wrapper, '변경 사항 저장')?.attributes('disabled')).toBeDefined()

    await buttonWithText(wrapper, '서버 최신 내용으로 되돌리기')?.trigger('click')
    await flushPromises()

    expect(getCurrentCurriculum).toHaveBeenCalledTimes(2)
    expect(store.curriculumSaveConflict).toBe(false)
    expect(store.hasChanges).toBe(false)
  })

  it('드래그를 목록 안의 수직 방향으로 제한해 순서를 바꾸고 이동 버튼은 표시하지 않는다', async () => {
    const { wrapper, store } = await mountCurriculum(repository())
    const firstItem = store.draftItems[0]!
    const firstTemplate = trainingCatalogFixture.find(
      (template) => template.trainingTemplateId === firstItem.trainingTemplateId,
    )!
    const list = wrapper.get<HTMLElement>('.recommendation-list')
    const articles = wrapper.findAll<HTMLElement>('.recommendation-list article')
    vi.spyOn(list.element, 'getBoundingClientRect').mockReturnValue(mockRect(0, 210))
    vi.spyOn(articles[0]!.element, 'getBoundingClientRect').mockReturnValue(mockRect(0, 62))
    vi.spyOn(articles[1]!.element, 'getBoundingClientRect').mockReturnValue(mockRect(70, 132))
    vi.spyOn(articles[2]!.element, 'getBoundingClientRect').mockReturnValue(mockRect(140, 202))
    const rowBody = articles[0]!.get('.recommendation-copy')
    const editorButton = articles[0]!.get('.material-edit-button')
    const removeButton = articles[0]!.get('.remove-button')

    for (const excludedButton of [editorButton, removeButton]) {
      dispatchPointerEvent(excludedButton.element, 'pointerdown', {
        button: 0,
        clientX: 40,
        clientY: 31,
        pointerId: 1,
      })
      dispatchPointerEvent(excludedButton.element, 'pointermove', {
        clientX: 40,
        clientY: 180,
        pointerId: 1,
      })
      dispatchPointerEvent(excludedButton.element, 'pointerup', {
        clientX: 40,
        clientY: 180,
        pointerId: 1,
      })
    }
    expect(store.draftItems[0]?.key).toBe(firstItem.key)
    expect(articles[0]!.attributes('style')).toBeUndefined()

    await articles[1]!.get('.recommendation-copy').trigger('click')
    await flushPromises()
    expect(store.selectedDraftItemKey).toBe(store.draftItems[1]?.key)

    dispatchPointerEvent(rowBody.element, 'pointerdown', {
      button: 0,
      clientX: 40,
      clientY: 31,
      pointerId: 1,
    })
    dispatchPointerEvent(rowBody.element, 'pointermove', {
      clientX: 999,
      clientY: 500,
      pointerId: 1,
    })
    await flushPromises()

    expect(articles[0]!.attributes('style')).toContain('translateY(148px)')
    expect(articles[0]!.attributes('style')).not.toContain('translateX')

    dispatchPointerEvent(rowBody.element, 'pointerup', {
      clientX: 999,
      clientY: 500,
      pointerId: 1,
    })
    await flushPromises()

    expect(store.draftItems[2]?.key).toBe(firstItem.key)
    expect(wrapper.text()).toContain(`${firstTemplate.trainingName}을(를) 3번째로 이동했습니다.`)
    expect(
      wrapper
        .findAll('button')
        .some((button) => /위로 이동|아래로 이동/.test(button.attributes('aria-label') ?? '')),
    ).toBe(false)
  })

  it('삭제 확인 후 선택한 훈련을 draft에서 제거한다', async () => {
    const { wrapper, store } = await mountCurriculum(repository())
    const target = store.draftItems[0]!

    await wrapper.find('.remove-button').trigger('click')
    await flushPromises()

    const confirmDialog = wrapper.findComponent(ConfirmDialog)
    expect(confirmDialog.props('open')).toBe(true)
    expect(confirmDialog.props('title')).toBe('다음 회차에서 훈련을 삭제할까요?')
    confirmDialog.vm.$emit('confirm')
    await flushPromises()

    expect(store.draftItems).toHaveLength(currentCurriculumFixture.trainings.length - 1)
    expect(store.draftItems.some((item) => item.key === target.key)).toBe(false)
    expect(wrapper.text()).toContain('2회 시행')
    expect(wrapper.text()).toContain('훈련을 3개 더 추가해 총 5개로 구성해야 합니다.')
  })

  it('검사 결과에서 지정한 추천 커리큘럼의 상태를 표시하고 최종 검수를 완료한다', async () => {
    const recommended: DailyCurriculum = {
      ...currentCurriculumFixture,
      sourceTestCurriculumId: 1_011,
      reviewStatus: 'REVIEW_REQUIRED',
      trainings: currentCurriculumFixture.trainings.map((training) => ({
        ...training,
        status: 'NOT_STARTED' as const,
      })),
    }
    const reviewed = {
      ...recommended,
      reviewStatus: 'REVIEW_COMPLETED' as const,
      reviewedByTeacherId: 7,
      reviewedAt: '2026-08-01T19:00:00',
    }
    const getCurriculum = vi
      .fn()
      .mockResolvedValueOnce(recommended)
      .mockResolvedValueOnce(reviewed)
    const completeCurriculumReview = vi.fn().mockResolvedValue({
      curriculumId: 201,
      reviewStatus: 'REVIEW_COMPLETED',
      reviewedByTeacherId: 7,
      reviewedAt: '2026-08-01T19:00:00',
    })
    const { wrapper } = await mountCurriculum(
      repository({ getCurriculum, completeCurriculumReview }),
      '/teacher/students/1/curriculum?curriculumId=201',
    )

    expect(getCurriculum).toHaveBeenCalledWith(
      1,
      201,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(wrapper.text()).toContain('실력 도전 #1011 추천')
    expect(wrapper.text()).toContain('최종 검수 필요')

    await buttonWithText(wrapper, '최종 검수 완료')?.trigger('click')
    await flushPromises()
    const reviewDialog = wrapper
      .findAllComponents(ConfirmDialog)
      .find((dialog) => dialog.props('title').includes('최종 검수'))
    expect(reviewDialog?.props('open')).toBe(true)
    reviewDialog?.vm.$emit('confirm')
    await flushPromises()

    expect(completeCurriculumReview).toHaveBeenCalledWith(1, 201)
    expect(wrapper.text()).toContain('최신 검수 내용이 아동용 앱에 제공될 수 있습니다.')
  })

  it('저장하지 않은 변경 사항이 있으면 최종 검수 버튼을 비활성화한다', async () => {
    const recommended: DailyCurriculum = {
      ...currentCurriculumFixture,
      sourceTestCurriculumId: 1_011,
      reviewStatus: 'REVIEW_REQUIRED',
      trainings: currentCurriculumFixture.trainings.map((training) => ({
        ...training,
        status: 'NOT_STARTED' as const,
      })),
    }
    const { wrapper, store } = await mountCurriculum(
      repository({ getCurriculum: vi.fn().mockResolvedValue(recommended) }),
      '/teacher/students/1/curriculum?curriculumId=201',
    )

    store.removeDraftItem(store.draftItems[0]!.key)
    await flushPromises()

    expect(wrapper.text()).toContain('저장하지 않은 변경 사항이 있어 최종 검수를 완료할 수 없습니다.')
    expect(buttonWithText(wrapper, '최종 검수 완료')?.attributes('disabled')).toBeDefined()
  })

  it.each([
    ['GENERATION_PENDING', 'AI 콘텐츠 생성 대기'],
    ['REVIEW_REQUIRED', '최종 검수 필요'],
    ['REGENERATION_REQUIRED', 'AI 콘텐츠 재생성 필요'],
    ['REVIEW_COMPLETED', '최종 검수 완료'],
  ] as const)('추천 커리큘럼 %s 상태를 %s로 표시한다', async (reviewStatus, label) => {
    const recommended: DailyCurriculum = {
      ...currentCurriculumFixture,
      sourceTestCurriculumId: 1_011,
      reviewStatus,
    }
    const { wrapper } = await mountCurriculum(
      repository({ getCurriculum: vi.fn().mockResolvedValue(recommended) }),
      '/teacher/students/1/curriculum?curriculumId=201',
    )

    expect(wrapper.find('.review-panel').text()).toContain(label)
  })
})

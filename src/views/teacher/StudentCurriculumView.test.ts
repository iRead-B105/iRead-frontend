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
import { useTrainingStore } from '@/stores/training'
import StudentCurriculumView from './StudentCurriculumView.vue'

function repository(overrides: Partial<TrainingRepository> = {}): TrainingRepository {
  return {
    getCatalog: vi.fn().mockResolvedValue(trainingCatalogFixture),
    getCurrentCurriculum: vi.fn().mockResolvedValue(currentCurriculumFixture),
    createCurriculum: vi.fn(),
    getCurriculum: vi.fn(),
    updateCurriculum: vi.fn().mockResolvedValue(currentCurriculumFixture),
    getExpectedWords: vi.fn().mockResolvedValue([]),
    addExpectedWord: vi.fn().mockResolvedValue(undefined),
    deleteExpectedWord: vi.fn().mockResolvedValue(undefined),
    generateTraining: vi.fn().mockResolvedValue({ questions: [] }),
    getTrainingDetail: vi.fn().mockResolvedValue(trainingDetailFixtures[0]),
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

  it('실제 training ID가 있는 반복 시행에서만 예상 단어·미리보기를 연다', async () => {
    const getExpectedWords = vi.fn().mockResolvedValue([{ wordId: 1, wordName: '꽃' }])
    const { wrapper } = await mountCurriculum(repository({ getExpectedWords }))

    const previewButtons = wrapper
      .findAll('button')
      .filter((button) => button.text().includes('예상 단어·미리보기'))
    expect(previewButtons).toHaveLength(3)
    await previewButtons[1]?.trigger('click')
    await flushPromises()

    expect(getExpectedWords).toHaveBeenCalledWith(
      1,
      102,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(wrapper.text()).toContain('서로 다른 받침 음절 비교하기 2/2회차')
    expect(wrapper.text()).toContain('읽기 전용')
    expect(wrapper.text()).not.toContain('자료 추가')
    expect(wrapper.text()).not.toContain('훈련 기본 정보')
  })

  it('성취도 null을 0%가 아니라 미수행 평가 기록 없음으로 표시한다', async () => {
    const { wrapper } = await mountCurriculum(repository())

    expect(wrapper.text()).toContain('34개 훈련')
    expect(wrapper.text()).toContain('미수행(평가 기록 없음)')
    expect(wrapper.text()).not.toContain('모음 따라 보기0%')
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
    expect(buttonWithText(wrapper, '순서 편집')?.attributes('disabled')).toBeDefined()
    expect(buttonWithText(wrapper, '예상 단어·미리보기')?.attributes('disabled')).toBeDefined()

    await buttonWithText(wrapper, '최신 내용 다시 불러오기')?.trigger('click')
    await flushPromises()

    expect(getCurrentCurriculum).toHaveBeenCalledTimes(2)
    expect(store.curriculumSynchronizationStatus).toBe('synced')
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
    expect(buttonWithText(wrapper, '순서 편집')?.attributes('disabled')).toBeDefined()

    await buttonWithText(wrapper, '서버 최신 내용으로 되돌리기')?.trigger('click')
    await flushPromises()

    expect(getCurrentCurriculum).toHaveBeenCalledTimes(2)
    expect(store.curriculumSaveConflict).toBe(false)
    expect(store.hasChanges).toBe(false)
  })

  it('drag 없이 위로·아래로 순서를 바꾸고 이동한 항목 안에 focus를 유지한다', async () => {
    const { wrapper, store } = await mountCurriculum(repository())
    const firstItem = store.draftItems[0]!
    const firstTemplate = trainingCatalogFixture.find(
      (template) => template.trainingTemplateId === firstItem.trainingTemplateId,
    )!

    await buttonWithText(wrapper, '순서 편집')?.trigger('click')
    const moveDown = wrapper
      .findAll('button')
      .find(
        (button) => button.attributes('aria-label') === `${firstTemplate.trainingName} 아래로 이동`,
      )
    await moveDown?.trigger('click')
    await flushPromises()

    expect(store.draftItems[1]?.key).toBe(firstItem.key)
    expect(wrapper.text()).toContain(`${firstTemplate.trainingName}을(를) 2번째로 이동했습니다.`)
    expect(document.activeElement?.closest('article')?.id).toBe(`curriculum-item-${firstItem.key}`)
  })

  it('삭제 확인 후 선택한 훈련을 draft에서 제거한다', async () => {
    const { wrapper, store } = await mountCurriculum(repository())
    const target = store.draftItems[0]!

    await buttonWithText(wrapper, '순서 편집')?.trigger('click')
    await flushPromises()
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
})

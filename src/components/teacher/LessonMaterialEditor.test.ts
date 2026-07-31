import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type {
  CurriculumTraining,
  LessonMaterialDocument,
  SaveLessonMaterialRequest,
  TrainingDetail,
} from '@/features/teacher/training'
import LessonMaterialEditor from './LessonMaterialEditor.vue'

function mountEditor(
  status: CurriculumTraining['status'],
  options: {
    readonly materialGenerationStatus?: 'idle' | 'loading' | 'success' | 'error'
    readonly requiresRegeneration?: boolean
  } = {},
) {
  const training: CurriculumTraining = {
    trainingId: 101,
    trainingTemplateId: 12,
    sequence: 1,
    unitName: '소리 듣고 고르기',
    trainingName: '서로 다른 받침 음절 비교하기',
    status,
  }
  const detail: TrainingDetail = {
    trainingId: 101,
    trainingTemplateId: 12,
    name: training.trainingName,
    form: null,
    generatedData: null,
    status,
    startedAt: null,
    finishedAt: null,
    result: null,
    accuracy: null,
  }
  const lessonMaterial: LessonMaterialDocument = {
    trainingId: 101,
    trainingTemplateId: 12,
    trainingName: training.trainingName,
    unitName: training.unitName,
    status,
    schemaVersion: 2,
    revision: 3,
    editable: status === 'NOT_READY' || status === 'NOT_STARTED',
    materials: Array.from({ length: 5 }, (_, index) => ({
      questionNo: index + 1,
      questionType: 'FINAL_CONSONANT_COMPARISON',
      responseType: 'SINGLE_CHOICE',
      requiredInputs: [],
      presentation: {
        activityName: `받침 소리 비교 ${index + 1}`,
        instruction: '끝소리가 같은 낱말을 골라 보세요.',
        hint: '낱말의 끝소리에 집중해요.',
        correctFeedback: '잘했어요.',
        retryFeedback: '다시 들어 보세요.',
      },
      content: { audioText: '꽃', choices: ['꽃', '낮', '산'] },
      answer: { answerIndex: 0 },
    })),
  }

  return mount(LessonMaterialEditor, {
    props: {
      training,
      attemptLabel: '서로 다른 받침 음절 비교하기 1/1회차',
      expectedWords: [{ wordId: 1, wordName: '꽃' }],
      detail,
      lessonMaterial,
      expectedWordsStatus: 'success',
      detailStatus: 'success',
      lessonMaterialStatus: 'success',
      lessonMaterialSaveStatus: 'idle',
      materialGenerationStatus: options.materialGenerationStatus ?? 'idle',
      requiresRegeneration: options.requiresRegeneration ?? status === 'NOT_READY',
      isMutating: false,
      isSavingLessonMaterial: false,
      expectedWordError: null,
      detailError: null,
      lessonMaterialError: null,
      lessonMaterialSaveError: null,
      materialGenerationError: null,
    },
    global: {
      stubs: {
        teleport: true,
        Dialog: { template: '<div><slot /></div>' },
        DialogContent: { template: '<section><slot /></section>' },
        DialogDescription: { template: '<p><slot /></p>' },
        DialogTitle: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('LessonMaterialEditor', () => {
  it('공통 편집 모델로 수정하고 저장 요청에서 서버 관리 필드를 제외한다', async () => {
    const wrapper = mountEditor('NOT_STARTED')
    const activityName = wrapper.find('fieldset input')

    await activityName.setValue('수정한 활동 이름')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '교안 저장')
      ?.trigger('click')

    const request = wrapper.emitted('save')?.[0]?.[0] as SaveLessonMaterialRequest | undefined
    expect(request).toBeDefined()
    if (!request) return
    expect(request).toMatchObject({ revision: 3 })
    expect(request.materials).toHaveLength(5)
    expect(request.materials[0]).toMatchObject({
      questionNo: 1,
      questionType: 'FINAL_CONSONANT_COMPARISON',
      presentation: { activityName: '수정한 활동 이름' },
    })
    expect(request).not.toHaveProperty('materials.0.responseType')
    expect(request).not.toHaveProperty('materials.0.requiredInputs')
  })

  it('진행 중 훈련은 같은 화면을 읽기 전용으로 제공한다', () => {
    const wrapper = mountEditor('IN_PROGRESS')

    expect(wrapper.text()).toContain('읽기 전용')
    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    expect(
      wrapper.findAll('button').find((button) => button.text() === '교안 저장')?.attributes('disabled'),
    ).toBeDefined()
  })

  it('자료 5개를 모두 표시하고 추가·삭제·순서 변경을 제공하지 않는다', async () => {
    const wrapper = mountEditor('NOT_STARTED')
    const materialTabs = wrapper.findAll('[role="tab"]')

    expect(materialTabs).toHaveLength(5)
    expect(materialTabs.map((tab) => tab.text())).toEqual([
      '자료 1',
      '자료 2',
      '자료 3',
      '자료 4',
      '자료 5',
    ])
    expect(wrapper.text()).not.toContain('자료 추가')
    expect(wrapper.text()).not.toContain('자료 삭제')

    await materialTabs[4]?.trigger('click')
    expect(wrapper.text()).toContain('자료 5 / 5')
  })

  it('재생성 필요 상태에서 기존 AI 재생성 동작을 유지한다', async () => {
    const wrapper = mountEditor('NOT_READY')
    const regenerateButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('AI 교안 재생성'))

    await regenerateButton?.trigger('click')
    expect(wrapper.emitted('regenerate')).toHaveLength(1)
  })

  it('삭제 확인 후 선택한 예상 단어 ID를 전달한다', async () => {
    const wrapper = mountEditor('NOT_STARTED')
    await wrapper.get('summary').trigger('click')
    await wrapper.get('button[aria-label="꽃 예상 단어 삭제"]').trigger('click')
    await flushPromises()
    const confirmDialog = wrapper
      .findAllComponents(ConfirmDialog)
      .find((dialog) => dialog.props('title') === '예상 단어를 삭제할까요?')
    expect(confirmDialog?.props('open')).toBe(true)
    confirmDialog?.vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.emitted('deleteWord')).toEqual([[1]])
  })

  it('하단 돌아가기 버튼으로 커리큘럼 화면 복귀 이벤트를 전달한다', async () => {
    const wrapper = mountEditor('NOT_STARTED')

    await wrapper.get('[data-test="material-editor-footer-back"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('수정 내용이 있으면 복귀 전에 취소 확인을 거친다', async () => {
    const wrapper = mountEditor('NOT_STARTED')
    await wrapper.find('fieldset input').setValue('수정한 활동')

    await wrapper.get('[data-test="material-editor-footer-back"]').trigger('click')
    const confirmDialog = wrapper
      .findAllComponents(ConfirmDialog)
      .find((dialog) => dialog.props('title') === '수정 내용을 취소할까요?')

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(confirmDialog?.props('open')).toBe(true)

    confirmDialog?.vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})

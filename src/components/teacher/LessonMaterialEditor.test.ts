import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type {
  CurriculumTraining,
  LessonMaterialDocument,
  LessonMaterialFieldError,
  SaveLessonMaterialRequest,
  TrainingDetail,
} from '@/features/teacher/training'
import LessonMaterialEditor from './LessonMaterialEditor.vue'

function mountEditor(
  status: CurriculumTraining['status'],
  options: {
    readonly materialGenerationStatus?: 'idle' | 'loading' | 'success' | 'error'
    readonly requiresRegeneration?: boolean
    readonly lessonMaterialSaveIssue?:
      | 'revision-conflict'
      | 'not-editable'
      | 'validation'
      | 'network'
      | null
    readonly lessonMaterialFieldErrors?: readonly LessonMaterialFieldError[]
    readonly lessonMaterialRemoteChange?: boolean
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
      detail,
      lessonMaterial,
      detailStatus: 'success',
      lessonMaterialStatus: 'success',
      lessonMaterialSaveStatus: 'idle',
      lessonMaterialSaveIssue: options.lessonMaterialSaveIssue ?? null,
      lessonMaterialFieldErrors: options.lessonMaterialFieldErrors ?? [],
      lessonMaterialRemoteChange: options.lessonMaterialRemoteChange ?? false,
      materialGenerationStatus: options.materialGenerationStatus ?? 'idle',
      requiresRegeneration: options.requiresRegeneration ?? status === 'NOT_READY',
      isSavingLessonMaterial: false,
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
    const audioText = wrapper.get('#material-1-content-audioText')

    await audioText.setValue('수정한 소리')
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
      content: { audioText: '수정한 소리' },
    })
    expect(request).not.toHaveProperty('materials.0.responseType')
    expect(request).not.toHaveProperty('materials.0.requiredInputs')
  })

  it('진행 중 훈련은 같은 화면을 읽기 전용으로 제공한다', () => {
    const wrapper = mountEditor('IN_PROGRESS')

    expect(wrapper.find('fieldset').attributes('disabled')).toBeDefined()
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === '교안 저장')
        ?.attributes('disabled'),
    ).toBeDefined()
  })

  it('저장 중 편집 불가로 전환되어도 작성 중인 초안은 화면에 유지한다', async () => {
    const wrapper = mountEditor('NOT_STARTED')
    const audioText = wrapper.get('#material-1-content-audioText')
    await audioText.setValue('저장 전 작성 내용')
    const document = wrapper.props('lessonMaterial')
    expect(document).not.toBeNull()
    if (!document) return

    await wrapper.setProps({
      lessonMaterial: {
        ...document,
        editable: false,
      },
      lessonMaterialSaveIssue: 'not-editable',
    })

    expect(wrapper.get('#material-1-content-audioText').element).toHaveProperty(
      'value',
      '저장 전 작성 내용',
    )
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
  })

  it('자료 5개를 모두 표시하고 드래그 앤 드롭으로 배열 순서를 변경한다', async () => {
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
    expect(wrapper.find('[aria-label="자료 1 뒤로 이동"]').exists()).toBe(false)

    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    }
    const materialItems = wrapper.findAll('.material-tab-item')
    await materialItems[2]?.trigger('dragstart', { dataTransfer })
    await materialItems[1]?.trigger('dragover', { dataTransfer })
    await materialItems[1]?.trigger('drop', { dataTransfer })
    await wrapper
      .findAll('button')
      .find((button) => button.text() === '교안 저장')
      ?.trigger('click')

    const request = wrapper.emitted('save')?.[0]?.[0] as SaveLessonMaterialRequest | undefined
    expect(request?.materials).toHaveLength(5)
    expect(request?.materials[0]?.questionNo).toBe(1)
    expect(request?.materials[0]?.presentation.activityName).toBe('받침 소리 비교 1')
    expect(request?.materials[1]?.questionNo).toBe(2)
    expect(request?.materials[1]?.presentation.activityName).toBe('받침 소리 비교 3')
    expect(request?.materials[2]?.presentation.activityName).toBe('받침 소리 비교 2')
  })

  it('재생성 필요 상태에서 기존 AI 재생성 동작을 유지한다', async () => {
    const wrapper = mountEditor('NOT_READY')
    const regenerateButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('AI 교안 재생성'))

    await regenerateButton?.trigger('click')
    expect(wrapper.emitted('regenerate')).toHaveLength(1)
  })

  it('원격 변경이 있으면 저장을 막고 확인 후 최신 교안을 요청한다', async () => {
    const wrapper = mountEditor('NOT_STARTED', {
      lessonMaterialSaveIssue: 'revision-conflict',
      lessonMaterialRemoteChange: true,
    })
    await wrapper.get('#material-1-content-audioText').setValue('수정한 활동')

    expect(wrapper.text()).toContain('서버의 교안이 변경되었습니다.')
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text() === '교안 저장')
        ?.attributes('disabled'),
    ).toBeDefined()

    await wrapper
      .findAll('button')
      .find((button) => button.text() === '최신 교안 불러오기')
      ?.trigger('click')
    const confirmDialog = wrapper
      .findAllComponents(ConfirmDialog)
      .find((dialog) => dialog.props('title') === '최신 교안을 불러올까요?')
    expect(confirmDialog?.props('open')).toBe(true)
    confirmDialog?.vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.emitted('reloadLatest')).toHaveLength(1)
  })

  it('422 검증 오류를 해당 편집 필드에 표시한다', () => {
    const wrapper = mountEditor('NOT_STARTED', {
      lessonMaterialSaveIssue: 'validation',
      lessonMaterialFieldErrors: [
        {
          path: 'materials[0].content.audioText',
          reason: 'NOT_BLANK',
          message: '소리 내용을 입력해 주세요.',
        },
      ],
    })

    expect(wrapper.text()).toContain('소리 내용을 입력해 주세요.')
    expect(wrapper.get('#material-1-content-audioText').attributes('aria-invalid')).toBe('true')
  })

  it('하단 돌아가기 버튼으로 커리큘럼 화면 복귀 이벤트를 전달한다', async () => {
    const wrapper = mountEditor('NOT_STARTED')

    await wrapper.get('[data-test="material-editor-footer-back"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('수정 내용이 있으면 복귀 전에 취소 확인을 거친다', async () => {
    const wrapper = mountEditor('NOT_STARTED')
    await wrapper.get('#material-1-content-audioText').setValue('수정한 활동')

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

  it('모달 밖을 클릭하면(pointer-down-outside) 복귀 이벤트를 발생시킨다', async () => {
    const wrapper = mountEditor('NOT_STARTED')

    await wrapper.get('.material-dialog').trigger('pointer-down-outside')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('교안 편집 화면에서 메타정보와 화면 표시 필드를 노출하지 않는다', () => {
    const wrapper = mountEditor('NOT_STARTED')

    expect(wrapper.text()).not.toContain('편집 가능')
    expect(wrapper.text()).not.toContain('동일 데이터 미리보기')
    expect(wrapper.text()).not.toContain('활동 이름')
    expect(wrapper.text()).not.toContain('활동 지시문')
    expect(wrapper.text()).not.toContain('정답 피드백')
    expect(wrapper.text()).not.toContain('재시도 피드백')
    expect(wrapper.text()).not.toContain('시작 전')
    expect(wrapper.find('.preview-device').exists()).toBe(false)
  })
})

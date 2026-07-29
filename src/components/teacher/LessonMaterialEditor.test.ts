import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { CurriculumTraining, TrainingDetail } from '@/features/teacher/training'
import LessonMaterialEditor from './LessonMaterialEditor.vue'

function mountEditor(status: CurriculumTraining['status']) {
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

  return mount(LessonMaterialEditor, {
    props: {
      training,
      attemptLabel: '서로 다른 받침 음절 비교하기 1/1회차',
      expectedWords: [{ wordId: 1, wordName: '꽃' }],
      detail,
      expectedWordsStatus: 'success',
      detailStatus: 'success',
      isMutating: false,
      expectedWordError: null,
      detailError: null,
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
  it('시작 전 예상 단어 변경 시 자료 재생성 필요성을 안내한다', () => {
    const wrapper = mountEditor('NOT_STARTED')

    expect(wrapper.text()).toContain('기존 훈련 자료가 무효화되며 재생성이 필요합니다.')
    expect(wrapper.find('#expected-word').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).toContain('훈련 자료와 템플릿 설정은 현재 백엔드에서 조회만 지원합니다.')
  })

  it('진행 중 훈련은 예상 단어를 읽기 전용으로 잠근다', () => {
    const wrapper = mountEditor('IN_PROGRESS')

    expect(wrapper.text()).toContain('진행 중이거나 완료된 훈련의 예상 단어는 변경할 수 없습니다.')
    expect(wrapper.find('#expected-word').attributes('disabled')).toBeDefined()
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.attributes('aria-label') === '꽃 예상 단어 삭제')
        ?.attributes('disabled'),
    ).toBeDefined()
  })

  it('삭제 확인 후 선택한 예상 단어 ID를 전달한다', async () => {
    const wrapper = mountEditor('NOT_STARTED')

    await wrapper.get('button[aria-label="꽃 예상 단어 삭제"]').trigger('click')
    await flushPromises()
    const confirmDialog = wrapper.findComponent(ConfirmDialog)
    expect(confirmDialog.props('open')).toBe(true)
    confirmDialog.vm.$emit('confirm')
    await flushPromises()

    expect(wrapper.emitted('deleteWord')).toEqual([[1]])
    wrapper.unmount()
  })
})

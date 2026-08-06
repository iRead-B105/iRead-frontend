import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
  defaultLessonMaterialData,
  type EditableLessonMaterialItem,
} from '@/features/teacher/training'
import BehaviorMaterialEditor from './BehaviorMaterialEditor.vue'

describe('BehaviorMaterialEditor', () => {
  it('서버 관리용 따라쓰기 에셋 키는 편집 화면에 노출하지 않는다', () => {
    const material: EditableLessonMaterialItem = {
      questionNo: 1,
      questionType: 'VOWEL_TRACE',
      presentation: {
        activityName: '모음 따라 보기',
        instruction: '따라 읽어요.',
        hint: '',
        correctFeedback: '잘했어요.',
        retryFeedback: '다시 해봐요.',
      },
      ...defaultLessonMaterialData('VOWEL_TRACE'),
    }
    const wrapper = mount(BehaviorMaterialEditor, {
      props: { material, editorCode: 'E01', disabled: false, fieldErrors: [] },
    })

    expect(wrapper.text()).not.toContain('따라쓰기 에셋 키')
    expect(wrapper.text()).not.toContain('획순 에셋은 서버가 관리합니다.')
    expect(wrapper.text()).toContain('화면 표시 글자')
  })
})

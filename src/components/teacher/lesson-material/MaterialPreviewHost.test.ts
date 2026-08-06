import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
  defaultLessonMaterialData,
  type EditableLessonMaterialItem,
} from '@/features/teacher/training'
import MaterialPreviewHost from './MaterialPreviewHost.vue'

function material(questionType: 'VOWEL_TRACE' | 'FINAL_CONSONANT_COMPARISON') {
  return {
    questionNo: 1,
    questionType,
    presentation: {
      activityName: '모음 따라 보기 1',
      instruction: '화면의 안내에 따라 활동해 보세요.',
      hint: '힌트',
      correctFeedback: '잘했어요.',
      retryFeedback: '다시 해보세요.',
    },
    ...defaultLessonMaterialData(questionType),
  } as EditableLessonMaterialItem
}

describe('MaterialPreviewHost', () => {
  it('따라보기 자료를 아동 앱과 같은 읽기 전용 활동 카드로 표시한다', () => {
    const wrapper = mount(MaterialPreviewHost, {
      props: { material: material('VOWEL_TRACE'), unitName: '글자 따라 보기' },
    })

    expect(wrapper.get('.trace-stage').attributes('aria-label')).toBe('글자 따라 보기 영역')
    expect(wrapper.get('.trace-glyph').text()).toBe('ㅏ')
    expect(wrapper.get('.speech-panel').text()).toContain('글자를 따라 읽어요!')
    expect(wrapper.get('.listen-panel button').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).not.toContain('모음 따라 보기 1')
    expect(wrapper.text()).not.toContain('화면의 안내에 따라 활동해 보세요.')
    expect(wrapper.text()).not.toContain('E01')
    expect(wrapper.text()).not.toContain('TRACE')
  })

  it('선택형 자료는 실제 조작되지 않는 선택 카드로 표시한다', () => {
    const wrapper = mount(MaterialPreviewHost, {
      props: {
        material: material('FINAL_CONSONANT_COMPARISON'),
        unitName: '소리 듣고 고르기',
      },
    })

    const choices = wrapper.findAll('.preview-choices button')
    expect(choices).toHaveLength(3)
    expect(choices.every((choice) => choice.attributes('disabled') !== undefined)).toBe(true)
  })
})

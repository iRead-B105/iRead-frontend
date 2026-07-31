import { describe, expect, it } from 'vitest'
import {
  LESSON_MATERIAL_QUESTION_TYPES,
  defaultLessonMaterialData,
  getLessonMaterialEditorDefinition,
  type EditableLessonMaterialItem,
} from '@/features/teacher/training'
import { toMaterialPreviewModel } from './materialPreviewAdapters'

describe('material preview adapters', () => {
  it.each(LESSON_MATERIAL_QUESTION_TYPES)(
    '%s 편집 Draft를 같은 행동 방식의 미리보기 모델로 변환한다',
    (questionType) => {
      const data = defaultLessonMaterialData(questionType)
      const material: EditableLessonMaterialItem = {
        questionNo: 1,
        questionType,
        presentation: {
          activityName: '활동',
          instruction: '안내',
          hint: '',
          correctFeedback: '정답',
          retryFeedback: '재시도',
        },
        ...data,
      }

      expect(toMaterialPreviewModel(material)?.editorCode).toBe(
        getLessonMaterialEditorDefinition(questionType)?.editorCode,
      )
    },
  )

  it('빈칸 토큰은 아동 화면용 빈칸으로 바꾼다', () => {
    const data = defaultLessonMaterialData('FILL_IN_THE_BLANK')
    const preview = toMaterialPreviewModel({
      questionNo: 1,
      questionType: 'FILL_IN_THE_BLANK',
      presentation: {
        activityName: '빈칸',
        instruction: '골라요',
        hint: '',
        correctFeedback: '정답',
        retryFeedback: '재시도',
      },
      ...data,
    })

    expect(preview?.editorCode).toBe('E12')
    expect(preview?.primaryText).toContain('______')
    expect(preview?.primaryText).not.toContain('{{blank}}')
  })
})

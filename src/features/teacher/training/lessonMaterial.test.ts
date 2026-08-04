import { describe, expect, it } from 'vitest'
import type { CurriculumTraining, SaveLessonMaterialRequest, TrainingDetail } from './model'
import {
  LESSON_MATERIAL_COUNT,
  LESSON_MATERIAL_MAX_COUNT,
  LESSON_MATERIAL_MIN_COUNT,
  assertLessonMaterialRequestCount,
  assertLessonMaterialResponseCount,
  createLessonMaterialDocumentFromLegacy,
  normalizeLessonMaterialDocument,
  saveRequestFromDocument,
} from './lessonMaterial'

const training: CurriculumTraining = {
  trainingId: 101,
  trainingTemplateId: 12,
  sequence: 1,
  unitName: '소리 듣고 고르기',
  trainingName: '서로 다른 받침 음절 비교하기',
  status: 'NOT_STARTED',
}

const detail: TrainingDetail = {
  trainingId: 101,
  trainingTemplateId: 12,
  name: training.trainingName,
  form: null,
  generatedData: {
    questions: [{ problem: { audioText: '꽃', choices: ['꽃', '낮'] } }],
  },
  status: 'NOT_STARTED',
  startedAt: null,
  finishedAt: null,
  result: null,
  accuracy: null,
}

describe('lesson material count contract', () => {
  it('Mock 교안을 항상 자료 5개와 연속된 문항 번호로 구성한다', () => {
    const document = createLessonMaterialDocumentFromLegacy(training, detail)

    expect(document.materials).toHaveLength(LESSON_MATERIAL_COUNT)
    expect(document.materials.map((material) => material.questionNo)).toEqual([1, 2, 3, 4, 5])
  })

  it('API 응답은 자료 1~5개를 허용한다', () => {
    const document = createLessonMaterialDocumentFromLegacy(training, detail)

    expect(
      assertLessonMaterialResponseCount({
        ...document,
        materials: document.materials.slice(0, LESSON_MATERIAL_MIN_COUNT),
      }).materials,
    ).toHaveLength(LESSON_MATERIAL_MIN_COUNT)
    expect(assertLessonMaterialResponseCount(document).materials).toHaveLength(
      LESSON_MATERIAL_MAX_COUNT,
    )
  })

  it.each([0, LESSON_MATERIAL_MAX_COUNT + 1])(
    'API 응답 자료가 %i개면 계약 불일치로 거부한다',
    (count) => {
      const document = createLessonMaterialDocumentFromLegacy(training, detail)

      expect(() =>
        assertLessonMaterialResponseCount({
          ...document,
          materials: Array.from({ length: count }, () => document.materials[0]),
        }),
      ).toThrowError(
        expect.objectContaining({
          status: 502,
          code: 'LESSON_MATERIAL_CONTRACT_MISMATCH',
        }),
      )
    },
  )

  it.each([0, LESSON_MATERIAL_MAX_COUNT + 1])(
    '저장 요청 자료가 %i개면 전송 전에 거부한다',
    (count) => {
      const document = createLessonMaterialDocumentFromLegacy(training, detail)
      const validRequest = saveRequestFromDocument(document)
      const invalidRequest: SaveLessonMaterialRequest = {
        ...validRequest,
        materials: Array.from({ length: count }, () => validRequest.materials[0]!),
      }

      expect(() => assertLessonMaterialRequestCount(invalidRequest)).toThrowError(
        expect.objectContaining({
          status: 422,
          code: 'LESSON_MATERIAL_VALIDATION_FAILED',
        }),
      )
    },
  )

  it('presentation이 null인 API 자료를 편집 가능한 기본 문구로 정규화한다', () => {
    const document = createLessonMaterialDocumentFromLegacy(training, detail)
    const normalized = normalizeLessonMaterialDocument({
      ...document,
      materials: [{ ...document.materials[0]!, presentation: null as never }],
    })

    expect(normalized.materials[0]?.presentation).toEqual({
      activityName: `${training.trainingName} 1`,
      instruction: '화면의 안내에 따라 활동해 보세요.',
      hint: '',
      correctFeedback: '잘했어요.',
      retryFeedback: '한 번 더 생각해 보세요.',
    })
  })
})

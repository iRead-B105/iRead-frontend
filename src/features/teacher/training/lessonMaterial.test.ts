import { describe, expect, it } from 'vitest'
import type {
  CurriculumTraining,
  SaveLessonMaterialRequest,
  TrainingDetail,
} from './model'
import {
  LESSON_MATERIAL_COUNT,
  assertLessonMaterialRequestCount,
  assertLessonMaterialResponseCount,
  createMockLessonMaterialDocument,
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

describe('lesson material fixed count policy', () => {
  it('Mock 교안을 항상 자료 5개와 연속된 문항 번호로 구성한다', () => {
    const document = createMockLessonMaterialDocument(training, detail)

    expect(document.materials).toHaveLength(LESSON_MATERIAL_COUNT)
    expect(document.materials.map((material) => material.questionNo)).toEqual([1, 2, 3, 4, 5])
  })

  it('5개가 아닌 API 응답을 계약 불일치로 거부한다', () => {
    const document = createMockLessonMaterialDocument(training, detail)

    expect(() =>
      assertLessonMaterialResponseCount({
        ...document,
        materials: document.materials.slice(0, LESSON_MATERIAL_COUNT - 1),
      }),
    ).toThrowError(
      expect.objectContaining({
        status: 502,
        code: 'LESSON_MATERIAL_CONTRACT_MISMATCH',
      }),
    )
  })

  it('5개가 아닌 저장 요청을 전송 전에 거부한다', () => {
    const document = createMockLessonMaterialDocument(training, detail)
    const validRequest = saveRequestFromDocument(document)
    const invalidRequest: SaveLessonMaterialRequest = {
      ...validRequest,
      materials: validRequest.materials.slice(0, LESSON_MATERIAL_COUNT - 1),
    }

    expect(() => assertLessonMaterialRequestCount(invalidRequest)).toThrowError(
      expect.objectContaining({
        status: 422,
        code: 'LESSON_MATERIAL_VALIDATION_FAILED',
      }),
    )
  })
})

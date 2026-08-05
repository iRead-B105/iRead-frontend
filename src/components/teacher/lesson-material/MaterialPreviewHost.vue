<script setup lang="ts">
import { computed } from 'vue'
import type { EditableLessonMaterialItem } from '@/features/teacher/training'
import { toMaterialPreviewModel } from './materialPreviewAdapters'

const props = defineProps<{
  material: EditableLessonMaterialItem
  unitName: string
}>()

const preview = computed(() => toMaterialPreviewModel(props.material))
</script>

<template>
  <div v-if="preview" class="activity-preview" :data-editor-code="preview.editorCode">
    <div class="activity-preview__context">
      <span>{{ unitName }}</span>
      <strong>{{ preview.editorCode }} · {{ preview.label }}</strong>
    </div>

    <div class="activity-preview__instruction">
      <small>{{ material.presentation.activityName }}</small>
      <h4>{{ material.presentation.instruction || preview.action }}</h4>
      <p>{{ preview.action }}</p>
    </div>

    <div v-if="preview.imageUrl || preview.imageDescription" class="scene-preview">
      <img v-if="preview.imageUrl" :src="preview.imageUrl" alt="문항 장면" />
      <div v-else aria-label="이미지 준비 중">이미지 준비 중</div>
      <small>{{ preview.imageDescription }}</small>
    </div>

    <div class="activity-preview__main" :class="`activity-preview__main--${preview.editorCode.toLowerCase()}`">
      <span v-if="preview.editorCode === 'E01'" class="trace-guide" aria-hidden="true">→</span>
      <strong>{{ preview.primaryText || '표시 내용을 입력해 주세요.' }}</strong>
      <small v-if="preview.secondaryText">{{ preview.secondaryText }}</small>
      <span v-if="preview.repeatCount" class="repeat-count">{{ preview.repeatCount }}회 반복</span>
    </div>

    <div v-if="preview.chips.length" class="preview-chips">
      <span v-for="(chip, index) in preview.chips" :key="`${chip}-${index}`">{{ chip }}</span>
    </div>

    <div v-if="preview.choiceTexts.length" class="preview-choices">
      <button
        v-for="(choice, index) in preview.choiceTexts"
        :key="`${choice}-${index}`"
        type="button"
        disabled
      >
        {{ choice }}
      </button>
    </div>

    <p v-if="material.presentation.hint" class="preview-hint">
      힌트 · {{ material.presentation.hint }}
    </p>

    <div class="preview-action" aria-hidden="true">
      {{ ['E01', 'E08', 'E09', 'E10'].includes(preview.editorCode) ? '말하기 시작' : '정답 확인' }}
    </div>
  </div>
  <p v-else class="unsupported" role="alert">
    {{ material.questionType }} 문항 유형은 아직 미리보기에 연결되지 않았습니다.
  </p>
</template>

<style scoped>
.activity-preview {
  display: grid;
  gap: 1rem;
  min-height: 28rem;
  align-content: start;
}

.activity-preview__context {
  display: grid;
  gap: 0.15rem;
}

.activity-preview__context span,
.activity-preview__instruction small {
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 800;
}

.activity-preview__context strong {
  color: #475569;
  font-size: 0.78rem;
}

.activity-preview__instruction {
  display: grid;
  gap: 0.35rem;
}

.activity-preview__instruction h4,
.activity-preview__instruction p {
  margin: 0;
}

.activity-preview__instruction h4 {
  color: #0f172a;
  font-size: 1.05rem;
}

.activity-preview__instruction p {
  color: #64748b;
  font-size: 0.8rem;
}

.scene-preview {
  display: grid;
  gap: 0.4rem;
}

.scene-preview img,
.scene-preview div {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 0.85rem;
  object-fit: cover;
}

.scene-preview div {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #dbeafe, #f0f9ff);
  color: #64748b;
  font-weight: 800;
}

.scene-preview small {
  color: #64748b;
  font-size: 0.7rem;
}

.activity-preview__main {
  position: relative;
  display: grid;
  place-items: center;
  gap: 0.4rem;
  min-height: 7.5rem;
  border: 1px solid #dbeafe;
  border-radius: 1rem;
  background: #f8fbff;
  padding: 1rem;
  text-align: center;
}

.activity-preview__main strong {
  color: #0f172a;
  font-size: 1.35rem;
  white-space: pre-wrap;
}

.activity-preview__main--e01 strong {
  font-size: 4rem;
}

.activity-preview__main small {
  color: #64748b;
}

.trace-guide {
  position: absolute;
  top: 0.65rem;
  right: 0.75rem;
  color: #3b82f6;
  font-size: 1.4rem;
}

.repeat-count {
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  padding: 0.25rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
}

.preview-chips,
.preview-choices {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.preview-chips span {
  border-radius: 0.65rem;
  background: #f1f5f9;
  color: #334155;
  padding: 0.55rem 0.75rem;
  font-weight: 700;
}

.preview-choices button {
  min-width: 5rem;
  border: 1px solid #bfdbfe;
  border-radius: 0.75rem;
  background: white;
  color: #1e3a8a;
  padding: 0.7rem 0.8rem;
  font-weight: 800;
  opacity: 1;
}

.preview-hint {
  margin: 0;
  border-radius: 0.65rem;
  background: #fff7ed;
  color: #9a3412;
  padding: 0.65rem 0.75rem;
  font-size: 0.76rem;
}

.preview-action {
  justify-self: center;
  border-radius: 0.65rem;
  background: #3b82f6;
  color: white;
  padding: 0.65rem 1rem;
  font-size: 0.78rem;
  font-weight: 800;
}

.unsupported {
  margin: 0;
  color: #b91c1c;
}
</style>

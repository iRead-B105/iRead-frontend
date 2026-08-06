<script setup lang="ts">
import { computed } from 'vue'
import SaveToast from '@/components/common/SaveToast.vue'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  normalizeTeacherMemo,
  STUDENT_MEMO_MAX_LENGTH,
  validateTeacherMemo,
} from '@/features/teacher/student'

const props = withDefaults(
  defineProps<{
    noteDraft: string
    savedValue?: string | null
    busy?: boolean
    error?: string
    saved?: boolean
  }>(),
  {
    savedValue: null,
    busy: false,
    error: '',
    saved: false,
  },
)

const emit = defineEmits<{
  'update:noteDraft': [value: string]
  saveNote: [text: string]
}>()

const validationError = computed(() => validateTeacherMemo(props.noteDraft))
const normalizedDraft = computed(() => normalizeTeacherMemo(props.noteDraft))
const normalizedSavedValue = computed(() => normalizeTeacherMemo(props.savedValue ?? ''))
const changed = computed(() => normalizedDraft.value !== normalizedSavedValue.value)
const canSave = computed(() => changed.value && !validationError.value && !props.busy)
const saveLabel = computed(() =>
  normalizedDraft.value === null && normalizedSavedValue.value !== null
    ? '메모 삭제'
    : '메모 저장',
)
</script>

<template>
  <section class="communication-panel" aria-labelledby="communication-title">
    <header class="communication-panel__heading">
      <div>
        <h2 id="communication-title">학습 기록</h2>
      </div>
      <SaveToast :visible="saved" message="교수자 메모가 저장되었습니다." :show-icon="false" />
    </header>

    <div class="note-editor">
      <div class="note-editor__field">
        <Textarea
          id="internal-note"
          class="textarea"
          :model-value="noteDraft"
          aria-label="학습 기록"
          :aria-invalid="Boolean(validationError)"
          :aria-describedby="validationError || error ? 'internal-note-error' : undefined"
          placeholder="학습 지도와 상담에 필요한 내부 메모를 작성합니다."
          @update:model-value="emit('update:noteDraft', String($event))"
        />
        <div class="note-editor__footer">
          <span class="note-editor__counter" :class="{ 'is-invalid': Boolean(validationError) }">
            {{ noteDraft.trim().length.toLocaleString('ko-KR') }} /
            {{ STUDENT_MEMO_MAX_LENGTH.toLocaleString('ko-KR') }}자
          </span>
          <Button
            size="sm"
            type="button"
            :disabled="!canSave"
            @click="emit('saveNote', noteDraft)"
          >
            {{ busy ? '저장 중...' : saveLabel }}
          </Button>
        </div>
      </div>
      <p v-if="validationError" id="internal-note-error" class="note-editor__error" role="alert">
        {{ validationError }}
      </p>
      <p v-else-if="error" id="internal-note-error" class="note-editor__error" role="alert">
        {{ error }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.communication-panel {
  display: grid;
  gap: 16px;
  padding: 22px 24px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: var(--radius-lg, 12px);
  background: var(--card, #ffffff);
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04);
}

.communication-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.communication-panel__heading h2 {
  margin: 0;
  color: var(--slate-900, #0f172a);
  font-size: 16px;
  font-weight: 700;
}

.note-editor {
  display: grid;
  gap: 8px;
}

.note-editor__field {
  display: grid;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.note-editor__field:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
}

:deep([data-slot="textarea"]) {
  min-height: 120px;
  padding: 14px 16px;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  outline: none !important;
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
  background: transparent;
  resize: vertical;
}

.note-editor__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8fafc;
  border-top: 1px solid #f1f5f9;
}

.note-editor__counter {
  color: #64748b;
  font-size: 12px;
  font-weight: 500;
}

.note-editor__counter.is-invalid,
.note-editor__error {
  color: #dc2626;
}

.note-editor__error {
  margin: 4px 0 0;
  font-size: 12px;
}
</style>
